import { Request, Response } from "express";
import { Task, Resource } from "../types";
import { readJson, writeJson } from "../storage/jsonStorage";
import { HttpError } from "../middleware/errorHandler";

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpError("Некоректний формат переліку значень.");
  }

  return [...new Set(value.map(String).map(item => item.trim()))]
    .filter(Boolean);
}

function parseTask(body: any, fixedId?: string): Task {
  const task: Task = {
    id: fixedId ?? String(body.id ?? "").trim(),
    name: String(body.name ?? "").trim(),
    duration: Number(body.duration),
    priority: Number(body.priority),
    hours: Number(body.hours),
    predecessors: stringArray(body.predecessors),
    requiredSpecializations: stringArray(body.requiredSpecializations),
    assignees: stringArray(body.assignees)
  };

  if (!/^[A-Za-z0-9_-]+$/.test(task.id) || !task.name) {
    throw new HttpError(
      "Вкажіть назву та ID латинськими літерами або цифрами."
    );
  }

  if (
    !Number.isInteger(task.duration) ||
    task.duration < 1 ||
    task.duration > 3650
  ) {
    throw new HttpError("Тривалість: ціле число від 1 до 3650.");
  }

  if (
    !Number.isInteger(task.priority) ||
    task.priority < 1 ||
    task.priority > 5
  ) {
    throw new HttpError("Пріоритет: ціле число від 1 до 5.");
  }

  if (!Number.isFinite(task.hours) || task.hours <= 0) {
    throw new HttpError("Трудомісткість повинна бути більшою за нуль.");
  }

  if (task.requiredSpecializations.length === 0) {
    throw new HttpError("Оберіть необхідну спеціалізацію.");
  }

  return task;
}

export function listTasks(req: Request, res: Response): void {
  res.json(readJson<Task[]>("tasks.json"));
}

export function createTask(req: Request, res: Response): void {
  const tasks = readJson<Task[]>("tasks.json");
  const task = parseTask(req.body);

  if (tasks.some(item => item.id === task.id)) {
    throw new HttpError("Робота з таким ID вже існує.", 409);
  }

  tasks.push(task);
  writeJson("tasks.json", tasks);

  res.status(201).json(task);
}

export function updateTask(req: Request, res: Response): void {
  const tasks = readJson<Task[]>("tasks.json");
  const id = String(req.params.id);
  const index = tasks.findIndex(task => task.id === id);

  if (index === -1) {
    throw new HttpError("Роботу не знайдено.", 404);
  }

  tasks[index] = parseTask(req.body, id);
  writeJson("tasks.json", tasks);

  res.json(tasks[index]);
}

export function deleteTask(req: Request, res: Response): void {
  const tasks = readJson<Task[]>("tasks.json");
  const id = String(req.params.id);

  if (!tasks.some(task => task.id === id)) {
    throw new HttpError("Роботу не знайдено.", 404);
  }

  if (tasks.some(task => task.predecessors.includes(id))) {
    throw new HttpError(
      "Спочатку приберіть посилання на цю роботу з її наступників.",
      409
    );
  }

  writeJson("tasks.json", tasks.filter(task => task.id !== id));

  res.status(204).end();
}

export function listResources(req: Request, res: Response): void {
  res.json(readJson<Resource[]>("resources.json"));
}

export function updateResource(req: Request, res: Response): void {
  const resources = readJson<Resource[]>("resources.json");
  const resource = resources.find(
    item => item.id === String(req.params.id)
  );

  if (!resource) {
    throw new HttpError("Виконавця не знайдено.", 404);
  }

  const availability = Number(req.body.availability);

  if (
    !Number.isFinite(availability) ||
    availability < 0 ||
    availability > 8
  ) {
    throw new HttpError("Доступність повинна бути від 0 до 8 год/день.");
  }

  resource.availability = availability;
  writeJson("resources.json", resources);

  res.json(resource);
}