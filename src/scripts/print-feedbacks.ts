import { db } from "../config/firebase.js";

async function printFeedbacks() {
  console.log("🔍 Fetching feedbacks...");
  try {
    const snapshot = await db.collection("feedbacks")
      .limit(5)
      .get();
    
    if (snapshot.empty) {
      console.log("No feedbacks found.");
    } else {
      snapshot.forEach(doc => {
        console.log(`\n========================================`);
        console.log(`Document ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error("Error fetching feedbacks:", err);
  }
  process.exit(0);
}

printFeedbacks();
