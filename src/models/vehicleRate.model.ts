import mongoose, { type Document, Schema } from "mongoose";
import { VEHICLE_RATE_TRIP_KEYS, type VehicleRateTripKey } from "../constants/statuses.js";

/** One document per trip pricing mode; `rates` maps vehicle key → numeric rate. */
export interface IVehicleRate extends Document {
  tripType: VehicleRateTripKey;
  rates: Map<string, number>;
  updatedAt: Date;
}

const vehicleRateSchema = new Schema<IVehicleRate>(
  {
    tripType: {
      type: String,
      enum: VEHICLE_RATE_TRIP_KEYS,
      required: true,
      unique: true,
    },
    rates: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  { timestamps: true },
);

export const VehicleRate = mongoose.model<IVehicleRate>("VehicleRate", vehicleRateSchema);
