import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initializeFirestoreTriggers, scanAndApproveExistingBookings } from "./services/firestore-triggers.js";

async function main(): Promise<void> {
  await connectDb();

  // Initialize Firestore triggers for auto-approving oneWay and roundTrip bookings
  try {
    initializeFirestoreTriggers();
    console.log("✅ Firestore auto-approval triggers initialized");

    // Scan and approve any existing pending bookings on startup
    const result = await scanAndApproveExistingBookings();
    console.log(`✅ Initial scan: ${result.approvedCount} bookings auto-approved`);
  } catch (err) {
    console.error("⚠️  Warning: Failed to initialize Firestore triggers:", err);
    console.error("   Booking auto-approval will not work. Check Firebase configuration.");
  }

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
