import { db } from "../config/firebase.js";

async function printComplaints() {
  console.log("\n🔍 Fetching raw complaints from Firestore...\n");
  try {
    const snapshot = await db.collection("complaints").get();
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

printComplaints();
