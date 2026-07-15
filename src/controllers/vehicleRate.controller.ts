import type { Request, Response } from "express";
import { VEHICLE_RATE_TRIP_KEYS, type VehicleRateTripKey } from "../constants/statuses.js";
import { VehicleRate } from "../models/vehicleRate.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";

function ratesToPlain(rates: unknown): Record<string, number> {
  if (!rates) return {};
  if (rates instanceof Map) return Object.fromEntries(rates.entries());
  if (typeof rates === "object" && !Array.isArray(rates)) return { ...(rates as Record<string, number>) };
  return {};
}

function assertTripKey(v: string): asserts v is VehicleRateTripKey {
  if (!VEHICLE_RATE_TRIP_KEYS.includes(v as VehicleRateTripKey)) {
    throw new ApiError(400, `tripType must be one of: ${VEHICLE_RATE_TRIP_KEYS.join(", ")}`);
  }
}

export const listVehicleRates = catchAsync(async (_req: Request, res: Response) => {
  const docs = await VehicleRate.find().lean();
  const data = docs.map((d) => ({
    ...d,
    rates: ratesToPlain(d.rates),
  }));
  res.json({ success: true, data });
});

export const adminUpsertVehicleRate = catchAsync(async (req: Request, res: Response) => {
  const tripType = String(req.params.tripType ?? "");
  assertTripKey(tripType);
  const body = req.body as { rates?: Record<string, number> };
  if (!body.rates || typeof body.rates !== "object") {
    throw new ApiError(400, "rates object is required, e.g. { \"TZ\": 400, \"V8\": 600 }");
  }
  const rates = new Map<string, number>();
  for (const [k, v] of Object.entries(body.rates)) {
    const num = Number(v);
    if (Number.isNaN(num)) throw new ApiError(400, `Invalid rate for key ${k}`);
    rates.set(k, num);
  }
  const doc = await VehicleRate.findOneAndUpdate(
    { tripType },
    { $set: { rates } },
    { new: true, upsert: true, runValidators: true },
  );
  const plain = doc!.toObject();
  res.json({
    success: true,
    data: { ...plain, rates: ratesToPlain(doc!.rates) },
  });
});
