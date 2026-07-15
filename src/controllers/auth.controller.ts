import type { Request, Response } from "express";
import { loginUser, registerUser, signToken } from "../services/auth.service.js";
import { User } from "../models/user.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, fullName, phoneNo, password } = req.body as {
    email?: string;
    fullName?: string;
    phoneNo?: string;
    password?: string;
  };
  if (!email || !fullName || !phoneNo || !password) {
    throw new ApiError(400, "email, fullName, phoneNo, and password are required");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
  const user = await registerUser({
    email,
    fullName,
    phoneNo,
    password,
  });
  const token = signToken(user);
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNo: user.phoneNo,
        role: user.role,
      },
      token,
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }
  const user = await loginUser(email, password);
  const token = signToken(user);
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNo: user.phoneNo,
        role: user.role,
      },
      token,
    },
  });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNo: user.phoneNo,
      role: user.role,
    },
  });
});
