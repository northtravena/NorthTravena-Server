import type { Request, Response } from "express";
import { Service } from "../models/service.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

/** Public catalog: active vehicles, optional filter by category name. */
export const listPublicServices = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = { status: "active" };
  const serviceType = req.query.serviceType as string | undefined;
  if (serviceType) q.serviceType = serviceType;
  const rows = await Service.find(q).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rows });
});

export const getPublicService = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "id");
  const row = await Service.findOne({ _id: id, status: "active" }).lean();
  if (!row) throw new ApiError(404, "Service not found");
  res.json({ success: true, data: row });
});

export const adminListServices = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = {};
  const serviceType = req.query.serviceType as string | undefined;
  const status = req.query.status as string | undefined;
  if (serviceType) q.serviceType = serviceType;
  if (status === "active" || status === "inactive") q.status = status;
  const { page, limit, skip } = parsePagination(req.query);
  const [rows, total] = await Promise.all([
    Service.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Service.countDocuments(q),
  ]);
  res.json(paginatedResponse(rows, total, page, limit));
});

export const adminCreateService = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const b = req.body as Record<string, unknown>;
  if (!String(b.serviceType ?? "").trim()) throw new ApiError(400, "serviceType is required");
  if (!String(b.vehicleName ?? "").trim()) throw new ApiError(400, "vehicleName is required");
  const amount = Number(b.amount);
  if (Number.isNaN(amount)) throw new ApiError(400, "amount must be a number");
  const doc = await Service.create({
    amount,
    color: b.color !== undefined ? String(b.color) : "",
    oil: b.oil !== undefined ? String(b.oil) : "",
    seats: b.seats !== undefined ? String(b.seats) : "",
    serviceDescription: b.serviceDescription !== undefined ? String(b.serviceDescription) : "",
    serviceName: b.serviceName !== undefined ? String(b.serviceName) : "Daily Booking",
    serviceType: String(b.serviceType ?? ""),
    transmissionType: b.transmissionType !== undefined ? String(b.transmissionType) : "",
    vehicleImage: b.vehicleImage !== undefined ? String(b.vehicleImage) : "",
    vehicleLabel: b.vehicleLabel !== undefined ? String(b.vehicleLabel) : "",
    vehicleName: String(b.vehicleName ?? ""),
    brand: b.brand !== undefined ? String(b.brand) : "",
    status: b.status === "inactive" ? "inactive" : "active",
    createdBy: parseObjectId(req.user.id, "user"),
  });
  res.status(201).json({ success: true, data: doc });
});

export const adminGetService = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "id");
  const row = await Service.findById(id).lean();
  if (!row) throw new ApiError(404, "Service not found");
  res.json({ success: true, data: row });
});

export const adminUpdateService = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "id");
  const b = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const keys = [
    "amount",
    "color",
    "oil",
    "seats",
    "serviceDescription",
    "serviceName",
    "serviceType",
    "transmissionType",
    "vehicleImage",
    "vehicleLabel",
    "vehicleName",
    "brand",
    "status",
  ] as const;
  for (const k of keys) {
    if (b[k] === undefined) continue;
    if (k === "amount") {
      const n = Number(b[k]);
      if (Number.isNaN(n)) throw new ApiError(400, "amount must be a number");
      patch.amount = n;
    } else if (k === "status") {
      const s = String(b[k]);
      if (s !== "active" && s !== "inactive") throw new ApiError(400, "status must be active or inactive");
      patch.status = s;
    } else {
      patch[k] = String(b[k]);
    }
  }
  const row = await Service.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!row) throw new ApiError(404, "Service not found");
  res.json({ success: true, data: row });
});

export const adminDeactivateService = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "id");
  const row = await Service.findByIdAndUpdate(id, { status: "inactive" }, { new: true });
  if (!row) throw new ApiError(404, "Service not found");
  res.json({ success: true, data: row });
});
