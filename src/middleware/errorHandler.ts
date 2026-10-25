import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export default function errorHandler(
  error: Error & { status?: number },
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(error.status || 500).json({
    error: error.message || "Внутрішня помилка сервера"
  });
}