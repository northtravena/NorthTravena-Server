import { db } from "../config/firebase.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Booking } from "../models/booking.model.js";

async function checkBookingStructure() {
  console.log("\n🔍 Checking Booking structures...\n");
  try {
    // 1. Check Firestore Booking
    const firestoreSnapshot = await db.collection("bookings").limit(1).get();
    if (!firestoreSnapshot.empty) {
      const doc = firestoreSnapshot.docs[0];
      console.log("🔥 Firestore Booking Sample:");
      console.log(JSON.stringify(doc.data(), null, 2));
    } else {
      console.log("🔥 Firestore bookings collection is empty");
    }

    console.log("\n" + "─".repeat(50) + "\n");

    // 2. Check MongoDB Booking
    await mongoose.connect(env.mongodbUri);
    const mongoBooking = await Booking.findOne().lean();
    if (mongoBooking) {
      console.log("🍃 MongoDB Booking Sample:");
      console.log(JSON.stringify(mongoBooking, null, 2));
    } else {
      console.log("🍃 MongoDB bookings collection is empty");
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkBookingStructure();
