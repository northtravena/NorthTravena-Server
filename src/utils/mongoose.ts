import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export function parseObjectId(id: string, label = "id"): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}
