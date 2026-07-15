import mongoose, { type Document, Schema } from "mongoose";
import { BOOKING_STATUSES, TRIP_TYPES, type BookingStatus, type TripType } from "../constants/statuses.js";

export interface IGeoPoint {
  lat: number;
  lng: number;
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  source: string;
  destination: string;
  sourceLocation: IGeoPoint;
  destinationLocation: IGeoPoint;
  pickupDate: string;
  pickupTime: string;
  dropDate?: string;
  dropTime?: string;
  status: BookingStatus;
  totalAmount: number;
  totalDistance: number;
  totalVehicles: number;
  tripType: TripType;
  workingDays?: number | null;
  vehicleId?: mongoose.Types.ObjectId;
  vehicleLabel?: string;
  paymentSkipped?: boolean;
  createdAt: Date;
}

const geoSchema = new Schema<IGeoPoint>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
    sourceLocation: { type: geoSchema, required: true },
    destinationLocation: { type: geoSchema, required: true },
    pickupDate: { type: String, required: true },
    pickupTime: { type: String, required: true },
    dropDate: { type: String },
    dropTime: { type: String },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "Pending",
      index: true,
    },
    totalAmount: { type: Number, required: true },
    totalDistance: { type: Number, required: true },
    totalVehicles: { type: Number, default: 1 },
    tripType: { type: String, enum: TRIP_TYPES, required: true },
    workingDays: { type: Number, min: 1, max: 7, default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Service" },
    vehicleLabel: { type: String },
    paymentSkipped: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

bookingSchema.index({ userId: 1, createdAt: -1 });

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
