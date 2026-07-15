import mongoose, { type Document, Schema } from "mongoose";

/** Admin-managed vehicle catalog (“Our Services”). */
export interface IService extends Document {
  amount: number;
  color: string;
  oil: string;
  seats: string;
  serviceDescription: string;
  serviceName: string;
  serviceType: string;
  transmissionType: string;
  vehicleImage: string;
  vehicleLabel: string;
  vehicleName: string;
  brand?: string;
  /** Catalog visibility / moderation */
  status: "active" | "inactive";
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    amount: { type: Number, required: true },
    color: { type: String, default: "" },
    oil: { type: String, default: "" },
    seats: { type: String, default: "" },
    serviceDescription: { type: String, default: "" },
    serviceName: { type: String, default: "Daily Booking" },
    serviceType: { type: String, required: true, index: true },
    transmissionType: { type: String, default: "" },
    vehicleImage: { type: String, default: "" },
    vehicleLabel: { type: String, default: "" },
    vehicleName: { type: String, required: true },
    brand: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

serviceSchema.index({ serviceType: 1, vehicleName: 1 });

export const Service = mongoose.model<IService>("Service", serviceSchema);
