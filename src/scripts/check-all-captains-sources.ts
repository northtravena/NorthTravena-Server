import { db } from "../config/firebase.js";

async function checkAllSources() {
  console.log("=== 1. FIREBASE users COLLECTION ===");
  const usersSnap = await db.collection("users").get();
  let roleCaptains = 0;
  let allUsers = 0;
  usersSnap.forEach(d => {
    allUsers++;
    const data = d.data();
    if ((data.role ?? "").toString().toLowerCase().includes("captain")) {
      roleCaptains++;
      console.log(`Firebase User Doc ${d.id}: name="${data.fullName ?? data.name}", role="${data.role}", status="${data.status}", isApproved=${data.isApproved}`);
    }
  });
  console.log(`Total users in Firebase: ${allUsers}, Role Captains: ${roleCaptains}`);

  console.log("\n=== 2. FIREBASE services COLLECTION ===");
  const servicesSnap = await db.collection("services").get();
  console.log(`Total services docs: ${servicesSnap.size}`);
  let approvedServices = 0;
  servicesSnap.forEach(d => {
    const data = d.data();
    console.log(`Service Doc ${d.id}: status="${data.status}", name="${data.vehicle_name}", user_id="${data.user_id}"`);
    if ((data.status ?? "").toString().toLowerCase() === "approved") {
      approvedServices++;
    }
  });
  console.log(`Approved Services count: ${approvedServices}`);

  console.log("\n=== 3. FIREBASE captains COLLECTION (if exists) ===");
  try {
    const captainsSnap = await db.collection("captains").get();
    console.log(`Total captains docs: ${captainsSnap.size}`);
    captainsSnap.forEach(d => console.log(`Captain Doc ${d.id}:`, d.data()));
  } catch (e) {
    console.log("No root captains collection");
  }

  process.exit(0);
}

checkAllSources();
