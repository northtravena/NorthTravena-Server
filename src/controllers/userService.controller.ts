import type { Request, Response } from "express";
import { USER_SERVICE_STATUSES, type UserServiceStatus } from "../constants/statuses.js";
import { UserService } from "../models/userService.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

function assertUserServiceStatus(v: string): asserts v is UserServiceStatus {
  if (!USER_SERVICE_STATUSES.includes(v as UserServiceStatus)) {
    throw new ApiError(400, `status must be one of: ${USER_SERVICE_STATUSES.join(", ")}`);
  }
}

export const createUserService = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const b = req.body as Record<string, unknown>;
  if (!String(b.serviceType ?? "").trim()) throw new ApiError(400, "serviceType is required");
  if (!String(b.vehicleName ?? "").trim()) throw new ApiError(400, "vehicleName is required");
  const amount = Number(b.amount);
  if (Number.isNaN(amount)) throw new ApiError(400, "amount must be a number");
  const doc = await UserService.create({
    userId: parseObjectId(req.user.id, "user"),
    amount,
    brand: b.brand !== undefined ? String(b.brand) : "",
    oil: b.oil !== undefined ? String(b.oil) : "",
    seats: b.seats !== undefined ? String(b.seats) : "",
    serviceDescription: b.serviceDescription !== undefined ? String(b.serviceDescription) : "",
    serviceName: b.serviceName !== undefined ? String(b.serviceName) : "Daily Booking",
    serviceType: String(b.serviceType ?? ""),
    transmissionType: b.transmissionType !== undefined ? String(b.transmissionType) : "",
    vehicleImage: b.vehicleImage !== undefined ? String(b.vehicleImage) : "",
    vehicleName: String(b.vehicleName ?? ""),
    status: "Pending",
  });
  res.status(201).json({ success: true, data: doc });
});

export const listMyUserServices = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const q: Record<string, unknown> = { userId: req.user.id };
  const status = req.query.status as string | undefined;
  if (status) {
    assertUserServiceStatus(status);
    q.status = status;
  }
  const rows = await UserService.find(q).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rows });
});

export const cancelMyUserService = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const id = parseObjectId(req.params.id, "id");
  const row = await UserService.findOne({ _id: id, userId: req.user.id });
  if (!row) throw new ApiError(404, "Service request not found");
  if (row.status !== "Pending") {
    throw new ApiError(400, "Only Pending requests can be cancelled");
  }
  row.status = "Cancelled";
  await row.save();
  res.json({ success: true, data: row });
});

export const adminListUserServices = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = {};
  const status = req.query.status as string | undefined;
  if (status) {
    assertUserServiceStatus(status);
    q.status = status;
  }
  const { page, limit, skip } = parsePagination(req.query);
  const [rows, total] = await Promise.all([
    UserService.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId", "email fullName phoneNo").lean(),
    UserService.countDocuments(q),
  ]);
  res.json(paginatedResponse(rows, total, page, limit));
});

export const adminUpdateUserServiceStatus = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "id");
  const status = String((req.body as { status?: string }).status ?? "");
  assertUserServiceStatus(status);
  const row = await UserService.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!row) throw new ApiError(404, "Service request not found");
  res.json({ success: true, data: row });
});
