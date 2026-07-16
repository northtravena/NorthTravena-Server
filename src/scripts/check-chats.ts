import { db } from "../config/firebase.js";

async function checkChatsForBooking() {
  const bookingIds = ["SWXJXqRCQnYIhCK03RDz", "9skDoYiiTXYab6ao1KC3"];

  for (const bid of bookingIds) {
    console.log(`\n🔍 Searching chats for booking ID: ${bid}`);
    const snapshot = await db.collection("chats").where("bookingId", "==", bid).get();
    if (snapshot.empty) {
      console.log("❌ No chat found for this booking.");
    } else {
      snapshot.forEach((doc) => {
        console.log(`✅ Chat doc found: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }
  }
  process.exit(0);
}

checkChatsForBooking();
