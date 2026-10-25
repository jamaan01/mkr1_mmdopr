import { Request, Response } from "express";
import {
  validateSchedule,
  generateSchedule,
  getHistory
} from "../services/scheduleService";

export function validate(req: Request, res: Response): void {
  res.json(validateSchedule());
}

export function generate(req: Request, res: Response): void {
  const startDate = String(req.body.startDate ?? "");

  res.json(generateSchedule(startDate));
}

export function history(req: Request, res: Response): void {
  res.json(getHistory());
}