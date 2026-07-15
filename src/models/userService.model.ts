import mongoose, { type Document, Schema } from "mongoose";
import { USER_SERVICE_STATUSES, type UserServiceStatus } from "../constants/statuses.js";

/** User-submitted service requests (daily booking / pick & drop with driver, etc.). */
export interface IUserService extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  brand: string;
  oil: string;
  seats: string;
  serviceDescription: string;
  serviceName: string;
  serviceType: string;
  transmissionType: string;
  vehicleImage: string;
  vehicleName: string;
  status: UserServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userServiceSchema = new Schema<IUserService>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    brand: { type: String, default: "" },
    oil: { type: String, default: "" },
    seats: { type: String, default: "" },
    serviceDescription: { type: String, default: "" },
    serviceName: { type: String, default: "Daily Booking" },
    serviceType: { type: String, required: true },
    transmissionType: { type: String, default: "" },
    vehicleImage: { type: String, default: "" },
    vehicleName: { type: String, required: true },
    status: {
      type: String,
      enum: USER_SERVICE_STATUSES,
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true },
);

userServiceSchema.index({ userId: 1, createdAt: -1 });

export const UserService = mongoose.model<IUserService>("UserService", userServiceSchema);
