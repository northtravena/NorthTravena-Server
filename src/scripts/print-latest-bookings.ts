import { db } from "../config/firebase.js";

async function printLatestBookings() {
  console.log("🔍 Fetching latest 5 Firestore bookings...");
  try {
    const snapshot = await db.collection("bookings")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    if (snapshot.empty) {
      console.log("No bookings found.");
    } else {
      snapshot.forEach(doc => {
        console.log(`\n========================================`);
        console.log(`Document ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error("Error fetching bookings:", err);
  }
  process.exit(0);
}

printLatestBookings();
