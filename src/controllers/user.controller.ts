import type { Request, Response } from "express";
import { ROLES, type Role } from "../constants/roles.js";
import { User } from "../models/user.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { assertLngLatPair, createPoint } from "../utils/geo.js";

export const adminListUsers = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = {};
  const role = req.query.role as string | undefined;
  if (role) {
    if (!ROLES.includes(role as Role)) {
      throw new ApiError(400, `role must be one of: ${ROLES.join(", ")}`);
    }
    q.role = role;
  }
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (search) {
    q.$or = [
      { email: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
      { phoneNo: { $regex: search, $options: "i" } },
    ];
  }

  const rows = await User.find(q)
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: rows,
    count: rows.length,
  });
});

export const adminGetUser = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "user id");
  const user = await User.findById(id).select("-password").lean();
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json({ success: true, data: user });
});

export const updateUserLocation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const { lat, lng } = req.body as { lat?: number; lng?: number };
  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "lat and lng are required");
  }
  assertLngLatPair(lng, lat);

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { currentLocation: createPoint(lng, lat) } },
    { new: true, runValidators: true },
  ).select("-password");

  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, data: user });
});
