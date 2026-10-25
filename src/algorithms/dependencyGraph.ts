import { Task } from "../types";

export function dependencyGraph(tasks: Task[]) {
  const errors: string[] = [];
  const ids = new Set(tasks.map(task => task.id));
  const order: Task[] = [];

  if (tasks.length === 0) {
    errors.push("Перелік робіт порожній.");
  }

  if (ids.size !== tasks.length) {
    errors.push("Ідентифікатори робіт повинні бути унікальними.");
  }

  for (const task of tasks) {
    for (const predecessor of task.predecessors) {
      if (!ids.has(predecessor)) {
        errors.push(
          `${task.id}: попередня робота ${predecessor} не існує.`
        );
      }

      if (predecessor === task.id) {
        errors.push(`${task.id}: робота залежить сама від себе.`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, order };
  }

  const remaining = new Map(
    tasks.map(task => [
      task.id,
      new Set(task.predecessors).size
    ])
  );

  const ready = tasks.filter(task => remaining.get(task.id) === 0);

  while (ready.length > 0) {
    ready.sort(
      (a, b) =>
        b.priority - a.priority ||
        a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    const current = ready.shift()!;
    order.push(current);

    for (const task of tasks) {
      if (task.predecessors.includes(current.id)) {
        const count = remaining.get(task.id)! - 1;
        remaining.set(task.id, count);

        if (count === 0) {
          ready.push(task);
        }
      }
    }
  }

  if (order.length !== tasks.length) {
    errors.push(
      "Виявлено циклічні залежності. Побудова плану неможлива."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    order
  };
}