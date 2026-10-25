import { Task, Resource, Schedule } from "../types";
import { readJson, writeJson } from "../storage/jsonStorage";
import { dependencyGraph } from "../algorithms/dependencyGraph";
import { buildSchedule } from "../algorithms/scheduleBuilder";
import { HttpError } from "../middleware/errorHandler";

export function validateSchedule() {
  const tasks = readJson<Task[]>("tasks.json");
  const result = dependencyGraph(tasks);

  return {
    valid: result.valid,
    errors: result.errors,
    order: result.order.map(task => task.id)
  };
}

export function getHistory(): Schedule[] {
  return readJson<Schedule[]>("schedule-history.json");
}

export function generateSchedule(startDate: string): Schedule {
  const date = new Date(`${startDate}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== startDate
  ) {
    throw new HttpError("Вкажіть коректну дату початку.");
  }

  const tasks = readJson<Task[]>("tasks.json");
  const resources = readJson<Resource[]>("resources.json");
  const graph = dependencyGraph(tasks);

  if (!graph.valid) {
    throw new HttpError(graph.errors.join(" "));
  }

  let result: Schedule;

  try {
    result = buildSchedule(graph.order, resources, startDate);
  } catch (error) {
    throw new HttpError((error as Error).message);
  }

  const history = getHistory();
  history.unshift(result);

  writeJson("schedule-history.json", history);

  return result;
}