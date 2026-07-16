import { db } from "../config/firebase.js";

async function listCollections() {
  console.log("\n🔍 Inspecting Firestore Collections...\n");

  try {
    const collections = await db.listCollections();
    console.log(`📊 Found ${collections.length} root collections in Firestore:\n`);

    for (const col of collections) {
      const colId = col.id;
      const snapshot = await col.limit(3).get();
      const countSnapshot = await col.count().get();
      const totalDocs = countSnapshot.data().count;

      console.log(`📂 Collection: "${colId}" (Total documents: ${totalDocs})`);
      console.log("─".repeat(50));

      if (snapshot.empty) {
        console.log("   (Empty collection or no readable documents)");
      } else {
        console.log(`   Sample document IDs and fields:`);
        snapshot.forEach((doc) => {
          const data = doc.data();
          const fields = Object.keys(data);
          console.log(`   - Document ID: ${doc.id}`);
          console.log(`     Fields: [${fields.join(", ")}]`);
        });
      }
      console.log("\n");
    }
  } catch (error) {
    console.error("❌ Error listing collections:", error);
  }

  process.exit(0);
}

listCollections();
