import { db } from "../config/firebase.js";

async function checkCompleted() {
  console.log("=== CHECKING ALL BOOKINGS ===");
  const snapshot = await db.collection("bookings").get();
  let totalGross = 0;
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const status = data.status;
    const amount = data.totalAmount ?? data.amount ?? data.fare ?? data.price ?? 0;
    
    console.log(`Doc: ${doc.id} | Status: "${status}" | Amount: ${amount} | Date: ${data.pickupDate}`);
    if (status === "Complete" || status === "completed" || status === "Completed") {
      count++;
      totalGross += Number(amount);
    }
  });

  console.log(`\nCompleted Count: ${count}`);
  console.log(`Total Gross Amount: ${totalGross}`);
  console.log(`20% Commission: ${totalGross * 0.20}`);
  console.log(`10% Commission: ${totalGross * 0.10}`);

  console.log("\n=== CHECKING CAPTAIN PAYMENTS ===");
  const paymentsSnap = await db.collection("captain_payments").get();
  paymentsSnap.forEach((doc) => {
    console.log(`Payment Doc: ${doc.id} | Data:`, doc.data());
  });

  process.exit(0);
}

checkCompleted();
