import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

/** Prefer public DNS before MongoDB connects (helps some networks / Atlas SRV). */
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri);
  console.log("Connected to MongoDB");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
