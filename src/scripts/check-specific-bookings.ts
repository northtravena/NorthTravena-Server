import { db } from "../config/firebase.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Booking } from "../models/booking.model.js";

async function checkSpecificBookings() {
  const ids = ["SWXJXqRCQnYIhCK03RDz", "9skDoYiiTXYab6ao1KC3"];

  for (const id of ids) {
    console.log(`\n🔍 Searching for Booking ID: ${id}`);
    console.log("─".repeat(40));

    // 1. Check Firestore
    try {
      const fsDoc = await db.collection("bookings").doc(id).get();
      if (fsDoc.exists) {
        console.log("🔥 Firestore: FOUND!");
        console.log(JSON.stringify(fsDoc.data(), null, 2));
      } else {
        console.log("🔥 Firestore: NOT FOUND");
      }
    } catch (err) {
      console.error("Firestore error:", err);
    }

    // 2. Check MongoDB
    try {
      await mongoose.connect(env.mongodbUri);
      let mongoDoc = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        mongoDoc = await Booking.findById(id).lean();
      }
      if (mongoDoc) {
        console.log("🍃 MongoDB: FOUND!");
        console.log(JSON.stringify(mongoDoc, null, 2));
      } else {
        console.log("🍃 MongoDB: NOT FOUND");
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error("MongoDB error:", err);
    }
  }
  process.exit(0);
}

checkSpecificBookings();
