import type { Request, Response } from "express";
import { Notification } from "../models/notification.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";

export const listMyNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const q: Record<string, unknown> = { userId: req.user.id };
  const read = req.query.read as string | undefined;
  if (read === "true") q.read = true;
  if (read === "false") q.read = false;
  const rows = await Notification.find(q).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rows });
});

export const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const id = parseObjectId(req.params.id, "id");
  const row = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { read: true },
    { new: true },
  );
  if (!row) throw new ApiError(404, "Notification not found");
  res.json({ success: true, data: row });
});
