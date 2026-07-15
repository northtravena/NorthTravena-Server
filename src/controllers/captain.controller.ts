import type { Request, Response } from "express";
import { Captain, CAPTAIN_STATUSES, CAPTAIN_VEHICLE_TYPES, type CaptainStatus, type CaptainVehicleType } from "../models/captain.model.js";
import { User } from "../models/user.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { assertLngLatPair, buildRoutePoint, createPoint } from "../utils/geo.js";

function assertVehicleType(v: string): asserts v is CaptainVehicleType {
  if (!CAPTAIN_VEHICLE_TYPES.includes(v as CaptainVehicleType)) {
    throw new ApiError(400, `vehicleType must be one of: ${CAPTAIN_VEHICLE_TYPES.join(", ")}`);
  }
}

function assertCaptainStatusFilter(v: string): asserts v is CaptainStatus {
  if (!CAPTAIN_STATUSES.includes(v as CaptainStatus)) {
    throw new ApiError(400, `status must be one of: ${CAPTAIN_STATUSES.join(", ")}`);
  }
}

function parseRouteInput(label: string, raw: unknown): { address: string; lat: number; lng: number } {
  if (!raw || typeof raw !== "object") {
    throw new ApiError(400, `${label} must be an object with address, lat, lng`);
  }
  const o = raw as Record<string, unknown>;
  return {
    address: String(o.address ?? ""),
    lat: Number(o.lat),
    lng: Number(o.lng),
  };
}

export const registerCaptain = catchAsync(async (req: Request, res: Response) => {
  const b = req.body as Record<string, unknown>;
  const fullName = String(b.fullName ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const cnic = String(b.cnic ?? "").trim();
  const licenceNumber = String(b.licenceNumber ?? "").trim();
  const vehicleModel = String(b.vehicleModel ?? "").trim();
  const registrationPlate = String(b.registrationPlate ?? "").trim();
  const vehicleTypeRaw = String(b.vehicleType ?? "").trim();
  const seatCapacity = Number(b.seatCapacity);

  if (!fullName || !phone || !cnic || !licenceNumber || !registrationPlate) {
    throw new ApiError(400, "fullName, phone, cnic, licenceNumber, and registrationPlate are required");
  }
  if (!vehicleTypeRaw) throw new ApiError(400, "vehicleType is required");
  assertVehicleType(vehicleTypeRaw);
  if (!Number.isInteger(seatCapacity) || seatCapacity < 1) {
    throw new ApiError(400, "seatCapacity must be an integer greater than 0");
  }

  const routeFromIn = parseRouteInput("routeFrom", b.routeFrom);
  const routeToIn = parseRouteInput("routeTo", b.routeTo);
  const routeFrom = buildRoutePoint(routeFromIn);
  const routeTo = buildRoutePoint(routeToIn);

  const cnicFront      = String(b.cnicFront      ?? "");
  const cnicBack       = String(b.cnicBack       ?? "");
  const licenceFront   = String(b.licenceFront   ?? "");
  const licenceBack    = String(b.licenceBack    ?? "");
  const vehiclePicture = String(b.vehiclePicture ?? "");

  const captain = await Captain.create({
    fullName,
    phone,
    cnic,
    licenceNumber,
    vehicleType: vehicleTypeRaw,
    vehicleModel,
    registrationPlate,
    seatCapacity,
    routeFrom,
    routeTo,
    status: "pending",
    images: { cnicFront, cnicBack, licenceFront, licenceBack, vehiclePicture },
    // Auto-mark document flags based on whether images were uploaded
    documentsSubmitted: {
      cnic:           !!(cnicFront || cnicBack),
      licence:        !!(licenceFront || licenceBack),
      registration:   !!registrationPlate,
      policeClearance: false,   // requires manual admin verification
    },
  });

  res.status(201).json({ success: true, data: captain });
});

export const getAllCaptains = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = {};
  const status = req.query.status as string | undefined;
  if (status) {
    assertCaptainStatusFilter(status);
    q.status = status;
  }
  const rows = await Captain.find(q).sort({ createdAt: -1 }).lean({ virtuals: true });
  res.json({ success: true, data: rows, count: rows.length });
});

export const getCaptainById = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "captain id");
  const row = await Captain.findById(id).lean({ virtuals: true });
  if (!row) throw new ApiError(404, "Captain not found");
  res.json({ success: true, data: row });
});

export const approveCaptain = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "captain id");
  const captain = await Captain.findById(id);
  if (!captain) throw new ApiError(404, "Captain not found");
  captain.status = "active";
  captain.approvedAt = new Date();
  await captain.save();
  res.json({ success: true, data: captain });
});

export const rejectCaptain = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "captain id");
  const captain = await Captain.findById(id);
  if (!captain) throw new ApiError(404, "Captain not found");
  captain.status = "rejected";
  await captain.save();
  res.json({ success: true, data: captain });
});

export const updateCaptainLocation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const id = parseObjectId(req.params.id, "captain id");
  const captain = await Captain.findById(id);
  if (!captain) throw new ApiError(404, "Captain not found");

  const isAdmin = req.user.role === "admin";
  if (!isAdmin) {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw new ApiError(401, "User not found");
    const normalizedUserPhone = String(user.phoneNo ?? "").replace(/\s+/g, "");
    const normalizedCaptainPhone = String(captain.phone ?? "").replace(/\s+/g, "");
    if (normalizedUserPhone !== normalizedCaptainPhone) {
      throw new ApiError(403, "You can only update location for your own captain profile (phone must match account)");
    }
  }

  const b = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (b.routeFrom !== undefined) {
    patch.routeFrom = buildRoutePoint(parseRouteInput("routeFrom", b.routeFrom));
  }
  if (b.routeTo !== undefined) {
    patch.routeTo = buildRoutePoint(parseRouteInput("routeTo", b.routeTo));
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, "Provide routeFrom and/or routeTo");
  }

  const updated = await Captain.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  res.json({ success: true, data: updated });
});

export const updateCaptainLiveLocation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const id = parseObjectId(req.params.id, "captain id");
  const captain = await Captain.findById(id);
  if (!captain) throw new ApiError(404, "Captain not found");

  const isAdmin = req.user.role === "admin";
  if (!isAdmin) {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw new ApiError(401, "User not found");
    const normalizedUserPhone = String(user.phoneNo ?? "").replace(/\s+/g, "");
    const normalizedCaptainPhone = String(captain.phone ?? "").replace(/\s+/g, "");
    if (normalizedUserPhone !== normalizedCaptainPhone) {
      throw new ApiError(403, "You can only update location for your own captain profile");
    }
  }

  const { lat, lng } = req.body as { lat?: number; lng?: number };
  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "lat and lng are required");
  }
  assertLngLatPair(lng, lat);

  captain.currentLocation = createPoint(lng, lat);
  await captain.save();

  res.json({ success: true, data: captain });
});

export const updateCaptain = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "captain id");
  const b = req.body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};

  if (b.fullName !== undefined) patch.fullName = String(b.fullName).trim();
  if (b.phone !== undefined) patch.phone = String(b.phone).trim();
  if (b.cnic !== undefined) patch.cnic = String(b.cnic).trim();
  if (b.licenceNumber !== undefined) patch.licenceNumber = String(b.licenceNumber).trim();
  if (b.vehicleModel !== undefined) patch.vehicleModel = String(b.vehicleModel).trim();
  if (b.registrationPlate !== undefined) patch.registrationPlate = String(b.registrationPlate).trim();
  if (b.seatCapacity !== undefined) patch.seatCapacity = Number(b.seatCapacity);
  if (b.status !== undefined) {
    assertCaptainStatusFilter(String(b.status));
    patch.status = String(b.status);
  }
  if (b.vehicleType !== undefined) {
    assertVehicleType(String(b.vehicleType));
    patch.vehicleType = String(b.vehicleType);
  }
  if (b.routeFrom !== undefined) {
    patch.routeFrom = buildRoutePoint(parseRouteInput("routeFrom", b.routeFrom));
  }
  if (b.routeTo !== undefined) {
    patch.routeTo = buildRoutePoint(parseRouteInput("routeTo", b.routeTo));
  }
  // Image fields — update images and recalculate documentsSubmitted flags
  const imgFields = ["cnicFront", "cnicBack", "licenceFront", "licenceBack", "vehiclePicture"] as const;
  const imgUpdates: Partial<Record<typeof imgFields[number], string>> = {};
  for (const field of imgFields) {
    if (b[field] !== undefined) {
      patch[`images.${field}`] = String(b[field]);
      imgUpdates[field] = String(b[field]);
    }
  }

  // If any image field was updated, recalculate the corresponding document flag.
  // We need the current state to merge with the incoming changes.
  if (Object.keys(imgUpdates).length > 0) {
    const current = await Captain.findById(id).lean();
    if (current) {
      const merged = { ...current.images, ...imgUpdates };
      if ("cnicFront" in imgUpdates || "cnicBack" in imgUpdates) {
        patch["documentsSubmitted.cnic"] = !!(merged.cnicFront || merged.cnicBack);
      }
      if ("licenceFront" in imgUpdates || "licenceBack" in imgUpdates) {
        patch["documentsSubmitted.licence"] = !!(merged.licenceFront || merged.licenceBack);
      }
    }
  }

  // Allow admin to manually toggle policeClearance
  if (b["documentsSubmitted.policeClearance"] !== undefined) {
    patch["documentsSubmitted.policeClearance"] = Boolean(b["documentsSubmitted.policeClearance"]);
  }

  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const updated = await Captain.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true },
  ).lean({ virtuals: true });

  if (!updated) throw new ApiError(404, "Captain not found");
  res.json({ success: true, data: updated });
});

export const deleteCaptain = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "captain id");
  const deleted = await Captain.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, "Captain not found");
  res.json({ success: true, data: { _id: id } });
});

export const findNearbyCaptains = catchAsync(async (req: Request, res: Response) => {
  const { lat, lng, radiusKm = 50 } = req.query as { lat?: string; lng?: string; radiusKm?: string };
  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng query parameters are required");
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusInMeters = Number(radiusKm) * 1000;

  assertLngLatPair(longitude, latitude);

  // First try: captains with a real live location (not the default [0,0])
  // Second try: captains whose routeFrom is within radius (covers captains who
  //             haven't updated their live location yet)
  const hasRealLocation = {
    status: "active",
    "currentLocation.coordinates.0": { $ne: 0 },
    "currentLocation.coordinates.1": { $ne: 0 },
    currentLocation: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: radiusInMeters,
      },
    },
  };

  const byRouteFrom = {
    status: "active",
    routeFrom: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: radiusInMeters,
      },
    },
  };

  // Run both queries and merge, deduplicating by _id
  const [byLive, byRoute] = await Promise.all([
    Captain.find(hasRealLocation).lean({ virtuals: true }).catch(() => []),
    Captain.find(byRouteFrom).lean({ virtuals: true }),
  ]);

  const seen = new Set<string>();
  const merged = [...byLive, ...byRoute].filter((c) => {
    const id = String(c._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  res.json({ success: true, data: merged, count: merged.length });
});
