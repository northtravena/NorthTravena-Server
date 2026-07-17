import type { Request, Response } from "express";
import { BOOKING_STATUSES, TRIP_TYPES, type BookingStatus, type TripType } from "../constants/statuses.js";
import { Booking } from "../models/booking.model.js";
import { Notification } from "../models/notification.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { sendEmail } from "../utils/mailer.js";

/** Accepts `oneWay`, `oneway`, `roundTrip`, `monthly`, etc. */
function normalizeTripType(raw: string): TripType {
  const key = raw.trim().toLowerCase().replace(/[_\s-]/g, "");
  const aliases: Record<string, TripType> = {
    oneway: "oneWay",
    roundtrip: "roundTrip",
    monthly: "monthly",
  };
  if (key in aliases) return aliases[key]!;
  if (TRIP_TYPES.includes(raw as TripType)) return raw as TripType;
  throw new ApiError(400, `tripType must be one of: ${TRIP_TYPES.join(", ")} (e.g. oneWay, roundTrip, monthly)`);
}

function assertBookingStatus(v: string): asserts v is BookingStatus {
  if (!BOOKING_STATUSES.includes(v as BookingStatus)) {
    throw new ApiError(400, `status must be one of: ${BOOKING_STATUSES.join(", ")}`);
  }
}

export const createBooking = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const b = req.body as Record<string, unknown>;
  const tripType = normalizeTripType(String(b.tripType ?? ""));

  const totalAmount = Number(b.totalAmount);
  const totalDistance = Number(b.totalDistance);
  if (!Number.isFinite(totalAmount) || !Number.isFinite(totalDistance)) {
    throw new ApiError(400, "totalAmount and totalDistance must be valid numbers");
  }
  const src = b.sourceLocation as unknown;
  const dst = b.destinationLocation as unknown;
  const geoOk = (x: unknown): x is { lat: number; lng: number } =>
    typeof x === "object" &&
    x !== null &&
    "lat" in x &&
    "lng" in x &&
    Number.isFinite(Number((x as { lat: unknown }).lat)) &&
    Number.isFinite(Number((x as { lng: unknown }).lng));
  if (!geoOk(src) || !geoOk(dst)) {
    throw new ApiError(400, "sourceLocation and destinationLocation must be { lat, lng } numbers");
  }
  if (!String(b.source ?? "").trim() || !String(b.destination ?? "").trim()) {
    throw new ApiError(400, "source and destination are required");
  }
  if (!String(b.pickupDate ?? "").trim() || !String(b.pickupTime ?? "").trim()) {
    throw new ApiError(400, "pickupDate and pickupTime are required");
  }

  // New bookings start as Pending. The matching and dispatch are handled dynamically.
  const initialStatus = "Pending";


  const doc = await Booking.create({
    userId: parseObjectId(req.user.id, "user"),
    source: String(b.source ?? ""),
    destination: String(b.destination ?? ""),
    sourceLocation: { lat: Number(src.lat), lng: Number(src.lng) },
    destinationLocation: { lat: Number(dst.lat), lng: Number(dst.lng) },
    pickupDate: String(b.pickupDate ?? ""),
    pickupTime: String(b.pickupTime ?? ""),
    dropDate: b.dropDate !== undefined ? String(b.dropDate) : undefined,
    dropTime: b.dropTime !== undefined ? String(b.dropTime) : undefined,
    totalAmount,
    totalDistance,
    totalVehicles: b.totalVehicles !== undefined ? Number(b.totalVehicles) : 1,
    tripType,
    workingDays: b.workingDays === null || b.workingDays === undefined ? null : Number(b.workingDays),
    vehicleId: b.vehicleId ? parseObjectId(String(b.vehicleId), "vehicleId") : undefined,
    vehicleLabel: b.vehicleLabel !== undefined ? String(b.vehicleLabel) : undefined,
    paymentSkipped: b.paymentSkipped !== undefined ? Boolean(b.paymentSkipped) : true,
    status: initialStatus,
  });

  res.status(201).json({ success: true, data: doc });
});

export const listMyBookings = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const q: Record<string, unknown> = { userId: req.user.id };
  const status = req.query.status as string | undefined;
  if (status) {
    assertBookingStatus(status);
    q.status = status;
  }
  const rows = await Booking.find(q).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rows });
});

export const cancelMyBooking = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const id = parseObjectId(req.params.id, "booking id");
  const booking = await Booking.findOne({ _id: id, userId: req.user.id });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "Pending" && booking.status !== "Approved") {
    throw new ApiError(400, "Only Pending or Approved bookings can be canceled by user");
  }
  booking.status = "Canceled";
  await booking.save();
  res.json({ success: true, data: booking });
});

export const adminListBookings = catchAsync(async (req: Request, res: Response) => {
  const q: Record<string, unknown> = {};
  const status = req.query.status as string | undefined;
  if (status) {
    assertBookingStatus(status);
    q.status = status;
  }
  const rows = await Booking.find(q).sort({ createdAt: -1 }).populate("userId", "email fullName phoneNo").lean();
  res.json({ success: true, data: rows });
});

export const adminGetBooking = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "booking id");
  const row = await Booking.findById(id).populate("userId", "email fullName phoneNo").lean();
  if (!row) throw new ApiError(404, "Booking not found");
  res.json({ success: true, data: row });
});

export const adminUpdateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const id = parseObjectId(req.params.id, "booking id");
  const status = String((req.body as { status?: string }).status ?? "");
  assertBookingStatus(status);
  const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
    .populate("userId", "email fullName")
    .lean();
  if (!booking) throw new ApiError(404, "Booking not found");

  if (status === "Approved" || status === "Canceled" || status === "Completed") {
    const user = booking.userId as unknown as { _id?: string; email?: string; fullName?: string } | undefined;
    if (user?._id) {
      const titleByStatus: Record<string, string> = {
        Approved: "Booking Approved",
        Canceled: "Booking Canceled",
        Completed: "Booking Completed",
      };
      const title = titleByStatus[status] ?? "Booking Updated";
      const message = `Your booking from ${booking.source} to ${booking.destination} is ${status.toLowerCase()}.`;

      await Notification.create({
        userId: user._id,
        bookingId: booking._id,
        title,
        message,
        type: "booking",
        bookingData: {
          id: booking._id,
          source: booking.source,
          destination: booking.destination,
          status: booking.status,
          pickupDate: booking.pickupDate,
          pickupTime: booking.pickupTime,
          totalAmount: booking.totalAmount,
          totalDistance: booking.totalDistance,
          tripType: booking.tripType,
        },
      });

      if (user.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: title,
            text: `${message}\n\nBooking ID: ${booking._id}\nNorth Travena`,
          });
        } catch (err) {
          console.error("Failed to send booking status email", err);
        }
      }
    }
  }

  res.json({ success: true, data: booking });
});
