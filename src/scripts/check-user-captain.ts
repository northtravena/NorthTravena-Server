import { db } from "../config/firebase.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Passenger } from "../models/passenger.model.js";

async function checkUserCaptain() {
  const uid = "fiJ3qioukUb2lVxMdN45Ab8Co7B2";

  console.log(`\n🔍 Checking User ID: ${uid}`);
  console.log("─".repeat(40));

  // 1. Check Firestore
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      console.log("🔥 Firestore User:");
      console.log(JSON.stringify(doc.data(), null, 2));
    } else {
      console.log("🔥 Firestore User NOT FOUND");
    }
  } catch (err) {
    console.error("Firestore error:", err);
  }

  // 2. Check MongoDB User
  try {
    await mongoose.connect(env.mongodbUri);
    // Find mongo user by email/phone or try id in case it matches
    const mongoUser = await User.findOne({ 
      $or: [
        { email: "hasnainiqbal8855@gmail.com" }, // common emails in seeds/tests
        { phoneNo: "03001234567" }
      ]
    }).lean();
    
    if (mongoUser) {
      console.log("\n🍃 MongoDB User found (sample):");
      console.log(JSON.stringify(mongoUser, null, 2));
      
      const passenger = await Passenger.findOne({ userId: mongoUser._id }).populate("assignedCaptain").lean();
      if (passenger) {
        console.log("🍃 MongoDB Passenger details:");
        console.log(JSON.stringify(passenger, null, 2));
      }
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error("MongoDB error:", err);
  }

  process.exit(0);
}

checkUserCaptain();
