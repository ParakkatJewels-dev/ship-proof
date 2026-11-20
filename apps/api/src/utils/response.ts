import { Response } from "express";
import { ApiResponse } from "@shipproof/shared";

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, error: string, statusCode = 500): Response {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(response);
}
