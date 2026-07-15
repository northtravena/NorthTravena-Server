import type { Request, Response } from "express";
import { ServiceType } from "../models/serviceType.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";

export const listServiceTypes = catchAsync(async (_req: Request, res: Response) => {
  const rows = await ServiceType.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: rows });
});

export const adminCreateServiceType = catchAsync(async (req: Request, res: Response) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  if (!name) throw new ApiError(400, "name is required");
  const doc = await ServiceType.create({ name });
  res.status(201).json({ success: true, data: doc });
});
