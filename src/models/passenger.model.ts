import mongoose, { type Document, Schema } from "mongoose";
import type { ObjectId } from "mongoose";

export const MATCH_STATUSES = ["matched", "unmatched", "on-hold"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface IRoutePoint {
    type: "Point";
    coordinates: [number, number];
    address: string;
}

export interface IPassenger extends Document {
    userId: ObjectId;
    residence: IRoutePoint;
    workplace: IRoutePoint;
    matchStatus: MatchStatus;
    assignedCaptain?: ObjectId;
    monthlyFee: number;
    subscriptionStartDate: Date;
    registeredAt: Date;
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

const passengerSchema = new Schema<IPassenger>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        residence: { type: routePointSchema, required: true },
        workplace: { type: routePointSchema, required: true },
        matchStatus: {
            type: String,
            enum: MATCH_STATUSES,
            default: "unmatched",
            index: true,
        },
        assignedCaptain: { type: Schema.Types.ObjectId, ref: "Captain" },
        monthlyFee: { type: Number, default: 0, min: 0 },
        subscriptionStartDate: { type: Date, default: () => new Date() },
        registeredAt: { type: Date, default: () => new Date() },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

passengerSchema.virtual("passenger_id").get(function getPassengerId() {
    return this._id.toHexString();
});

passengerSchema.index({ residence: "2dsphere" });
passengerSchema.index({ workplace: "2dsphere" });

export const Passenger = mongoose.model<IPassenger>("Passenger", passengerSchema);
