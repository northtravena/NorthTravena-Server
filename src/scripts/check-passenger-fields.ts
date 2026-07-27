import { db } from "../config/firebase.js";

async function checkPassengers() {
  console.log("=== CHECKING FIREBASE USERS / PASSENGERS ===");
  const usersSnap = await db.collection("users").get();
  
  usersSnap.forEach((doc) => {
    const data = doc.data();
    const role = (data.role ?? "").toString().toLowerCase();
    if (!role || role === "passenger" || role === "user" || role === "customer") {
      console.log(`\n================ PASSENGER DOC: ${doc.id} ================`);
      console.log(JSON.stringify(data, null, 2));
    }
  });

  process.exit(0);
}

checkPassengers();
