import "../config/env.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

async function checkAdmins() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(env.mongodbUri);

  const admins = await User.find({ role: "admin" }).select("+password").lean();
  console.log(`Found ${admins.length} Admin User(s) in MongoDB:`);
  
  admins.forEach((a) => {
    console.log(`- ID: ${a._id} | Email: ${a.email} | Name: ${a.fullName} | Phone: ${a.phoneNo}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

checkAdmins();
