import { db } from "../config/firebase.js";

async function printRides() {
  console.log("\n🔍 Fetching raw rides from Firestore...\n");
  try {
    const snapshot = await db.collection("rides").get();
    console.log(`Total rides in Firestore: ${snapshot.size}`);
    snapshot.forEach((doc) => {
      console.log(`📋 ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log("─".repeat(40));
    });
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

printRides();
