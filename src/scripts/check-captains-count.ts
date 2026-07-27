import { db } from "../config/firebase.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Captain } from "../models/captain.model.js";

async function checkCaptains() {
  console.log("=== CHECKING FIREBASE CAPTAINS ===");
  const usersSnap = await db.collection("users").get();
  let fbCaptainCount = 0;
  const fbCaptainsList: Array<any> = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const role = (data.role ?? "").toString().toLowerCase();
    if (role === "captain") {
      fbCaptainCount++;
      fbCaptainsList.push({ id: doc.id, name: data.fullName ?? data.name, isOnline: data.isOnline, status: data.status, isApproved: data.isApproved });
    }
  });

  console.log(`Firebase Users with role === 'captain': ${fbCaptainCount}`);
  console.log(JSON.stringify(fbCaptainsList, null, 2));

  console.log("\n=== CHECKING MONGODB CAPTAINS ===");
  await mongoose.connect(env.mongodbUri);
  const mongoAll = await Captain.find().lean();
  const mongoActive = await Captain.find({ status: "active" }).lean();
  
  console.log(`MongoDB Total Captains: ${mongoAll.length}`);
  console.log(`MongoDB Active Status Captains (${mongoActive.length}):`);
  console.log(mongoActive.map(c => ({ id: c._id, name: c.fullName, status: c.status })));

  await mongoose.disconnect();
  process.exit(0);
}

checkCaptains();
