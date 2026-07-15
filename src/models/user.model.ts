import bcrypt from "bcryptjs";
import mongoose, { type Document, Schema } from "mongoose";
import { ROLES, type Role } from "../constants/roles.js";

export interface IUser extends Document {
  email: string;
  fullName: string;
  phoneNo: string;
  role: Role;
  password?: string;
  currentLocation?: {
    type: "Point";
    coordinates: [number, number];
  };
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, default: "user" },
    password: { type: String, select: false, minlength: 6 },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

userSchema.index({ currentLocation: "2dsphere" });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
