import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../constants/roles.js";
import { User, type IUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export function signToken(user: IUser): string {
  return jwt.sign(
    { sub: String(user._id), role: user.role as Role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as any },
  );
}

export async function registerUser(input: {
  email: string;
  fullName: string;
  phoneNo: string;
  password: string;
}): Promise<IUser> {
  const exists = await User.findOne({ email: input.email.toLowerCase() });
  if (exists) {
    throw new ApiError(409, "Email already registered");
  }
  const user = await User.create({
    email: input.email,
    fullName: input.fullName,
    phoneNo: input.phoneNo,
    password: input.password,
    role: "user",
  });
  return user;
}

export async function loginUser(email: string, password: string): Promise<IUser> {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !user.password) {
    throw new ApiError(401, "Invalid email or password");
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    throw new ApiError(401, "Invalid email or password");
  }
  return user;
}
