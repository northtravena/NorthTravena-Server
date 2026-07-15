import mongoose, { type Document, Schema } from "mongoose";

export interface IServiceType extends Document {
  name: string;
}

const serviceTypeSchema = new Schema<IServiceType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: false },
);

export const ServiceType = mongoose.model<IServiceType>("ServiceType", serviceTypeSchema);
