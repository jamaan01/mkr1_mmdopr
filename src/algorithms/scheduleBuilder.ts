import { PlannedTask, Resource, Schedule, Task } from "../types";

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);

  result.setUTCDate(result.getUTCDate() + days);

  return result.toISOString().slice(0, 10);
}

export function buildSchedule(
  order: Task[],
  resources: Resource[],
  startDate: string
): Schedule {
  const conflicts: string[] = [];
  const durations: Record<string, number> = {};
  const workers: Record<string, Resource[]> = {};
  const dailyHours: Record<string, number> = {};

  for (const task of order) {
    const people = task.assignees.map(id => {
      const resource = resources.find(item => item.id === id);

      if (!resource) {
        throw new Error(`${task.id}: виконавець ${id} не існує.`);
      }

      return resource;
    });

    if (people.length === 0) {
      throw new Error(`${task.id}: призначте виконавця.`);
    }

    for (const specialization of task.requiredSpecializations) {
      if (!people.some(person => person.specialization === specialization)) {
        throw new Error(
          `${task.id}: немає призначеного виконавця зі спеціалізацією «${specialization}».`
        );
      }
    }

    for (const person of people) {
      if (!task.requiredSpecializations.includes(person.specialization)) {
        throw new Error(
          `${task.id}: спеціалізація ${person.id} не відповідає роботі.`
        );
      }

      if (person.availability <= 0) {
        throw new Error(
          `${task.id}: виконавець ${person.id} недоступний.`
        );
      }
    }

    const hoursPerPerson = task.hours / people.length;

    const requiredDays = Math.max(
      ...people.map(person =>
        Math.ceil(hoursPerPerson / person.availability)
      )
    );

    const duration = Math.max(task.duration, requiredDays);

    workers[task.id] = people;
    durations[task.id] = duration;
    dailyHours[task.id] = hoursPerPerson / duration;

    if (duration > task.duration) {
      conflicts.push(
        `${task.id}: тривалість збільшено з ${task.duration} до ${duration} дн. через доступність виконавців.`
      );
    }
  }

  const earlyStart: Record<string, number> = {};
  const earlyFinish: Record<string, number> = {};

  for (const task of order) {
    earlyStart[task.id] = Math.max(
      0,
      ...task.predecessors.map(id => earlyFinish[id])
    );

    earlyFinish[task.id] =
      earlyStart[task.id] + durations[task.id];
  }

  const baselineDuration = Math.max(...Object.values(earlyFinish));

  const lateStart: Record<string, number> = {};

  for (const task of [...order].reverse()) {
    const successors = order.filter(item =>
      item.predecessors.includes(task.id)
    );

    const lateFinish = successors.length > 0
      ? Math.min(...successors.map(item => lateStart[item.id]))
      : baselineDuration;

    lateStart[task.id] = lateFinish - durations[task.id];
  }

  const loads: Record<string, number[]> = {};
  const finishDays: Record<string, number> = {};
  const planned: PlannedTask[] = [];

  for (const resource of resources) {
    loads[resource.id] = [];
  }

  for (const task of order) {
    const duration = durations[task.id];
    const people = workers[task.id];
    const hours = dailyHours[task.id];

    const earliest = Math.max(
      0,
      ...task.predecessors.map(id => finishDays[id])
    );

    let start = earliest;

    const hasCapacity = (day: number): boolean =>
      people.every(person => {
        for (let offset = 0; offset < duration; offset++) {
          const used = loads[person.id][day + offset] || 0;

          if (used + hours > person.availability + 0.000001) {
            return false;
          }
        }

        return true;
      });

    while (!hasCapacity(start)) {
      start++;
    }

    if (start > earliest) {
      conflicts.push(
        `${task.id}: початок перенесено на ${start - earliest} дн. через зайнятість виконавців. Конфлікт усунено.`
      );
    }

    for (const person of people) {
      for (let day = start; day < start + duration; day++) {
        loads[person.id][day] =
          (loads[person.id][day] || 0) + hours;
      }
    }

    finishDays[task.id] = start + duration;

    const reserve = lateStart[task.id] - earlyStart[task.id];

    planned.push({
      ...task,
      plannedDuration: duration,
      startDay: start,
      endDay: start + duration,
      startDate: addDays(startDate, start),
      finishDate: addDays(startDate, start + duration - 1),
      earlyStart: earlyStart[task.id],
      lateStart: lateStart[task.id],
      reserve,
      critical: reserve === 0
    });
  }

  const duration = Math.max(...Object.values(finishDays));

  for (const resource of resources) {
    loads[resource.id] = Array.from(
      { length: duration },
      (_, day) => Number((loads[resource.id][day] || 0).toFixed(2))
    );
  }

  return {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    startDate,
    finishDate: addDays(startDate, duration - 1),
    duration,
    baselineDuration,
    order: order.map(task => task.id),
    tasks: planned,
    resources: resources.map(resource => ({ ...resource })),
    loads,
    conflicts
  };
}