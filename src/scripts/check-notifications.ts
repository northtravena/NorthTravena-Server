import { db } from "../config/firebase.js";

async function checkNotifications() {
  console.log("=== CHECKING FIREBASE NOTIFICATIONS ===");
  const snap = await db.collection("notifications").limit(5).get();
  console.log(`Total count limit 5 snapshot size: ${snap.size}`);
  snap.forEach(d => {
    console.log(`Doc ${d.id}:`, JSON.stringify(d.data(), null, 2));
  });

  const countSnap = await db.collection("notifications").count().get();
  console.log(`Total notifications in Firestore: ${countSnap.data().count}`);

  process.exit(0);
}

checkNotifications();
