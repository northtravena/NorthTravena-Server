import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ success: false, message: messages.join(", ") });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: "Invalid id format" });
    return;
  }

  const code = err && typeof err === "object" && "code" in err ? (err as { code?: number }).code : undefined;
  if (code === 11000) {
    res.status(409).json({ success: false, message: "Duplicate field value" });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: env.nodeEnv === "development" ? String(err) : "Internal server error",
  });
}
