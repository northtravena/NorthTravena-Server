import mongoose, { type Document, Schema } from "mongoose";

export const CAPTAIN_STATUSES = ["pending", "active", "inactive", "rejected"] as const;
export type CaptainStatus = (typeof CAPTAIN_STATUSES)[number];

export const CAPTAIN_VEHICLE_TYPES = ["car", "van", "other"] as const;
export type CaptainVehicleType = (typeof CAPTAIN_VEHICLE_TYPES)[number];

export interface IRoutePoint {
  type: "Point";
  coordinates: [number, number];
  address: string;
}

export interface ICaptain extends Document {
  fullName: string;
  phone: string;
  cnic: string;
  licenceNumber: string;
  vehicleType: CaptainVehicleType;
  vehicleModel: string;
  registrationPlate: string;
  seatCapacity: number;
  routeFrom: IRoutePoint;
  routeTo: IRoutePoint;
  currentLocation?: {
    type: "Point";
    coordinates: [number, number];
  };
  status: CaptainStatus;
  documentsSubmitted: {
    cnic: boolean;
    licence: boolean;
    registration: boolean;
    policeClearance: boolean;
  };
  images: {
    cnicFront?: string;
    cnicBack?: string;
    licenceFront?: string;
    licenceBack?: string;
    vehiclePicture?: string;
  };
  rating: number;
  registeredAt: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const routePointSchema = new Schema<IRoutePoint>(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(v: number[]) {
          return Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
        },
        message: "coordinates must be [lng, lat]",
      },
    },
    address: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const documentsSchema = new Schema(
  {
    cnic: { type: Boolean, default: false },
    licence: { type: Boolean, default: false },
    registration: { type: Boolean, default: false },
    policeClearance: { type: Boolean, default: false },
  },
  { _id: false },
);

const captainSchema = new Schema<ICaptain>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    cnic: { type: String, required: true, trim: true },
    licenceNumber: { type: String, required: true, trim: true },
    vehicleType: { type: String, enum: CAPTAIN_VEHICLE_TYPES, required: true },
    vehicleModel: { type: String, default: "", trim: true },
    registrationPlate: { type: String, required: true, trim: true },
    seatCapacity: { type: Number, required: true, min: 1 },
    routeFrom: { type: routePointSchema, required: true },
    routeTo: { type: routePointSchema, required: true },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    status: {
      type: String,
      enum: CAPTAIN_STATUSES,
      default: "pending",
      index: true,
    },
    documentsSubmitted: { type: documentsSchema, default: () => ({}) },
    images: {
      type: new Schema(
        {
          cnicFront:      { type: String, default: "" },
          cnicBack:       { type: String, default: "" },
          licenceFront:   { type: String, default: "" },
          licenceBack:    { type: String, default: "" },
          vehiclePicture: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    rating: { type: Number, default: 0, min: 0 },
    registeredAt: { type: Date, default: () => new Date() },
    approvedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

captainSchema.virtual("captain_id").get(function getCaptainId() {
  return this._id.toHexString();
});

captainSchema.index({ routeFrom: "2dsphere" });
captainSchema.index({ routeTo: "2dsphere" });
captainSchema.index({ currentLocation: "2dsphere" });

export const Captain = mongoose.model<ICaptain>("Captain", captainSchema);
