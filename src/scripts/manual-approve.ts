/**
 * Manually trigger auto-approval for pending oneWay/roundTrip bookings
 * Run with: npx tsx src/scripts/manual-approve.ts
 */

import { scanAndApproveExistingBookings } from "../services/firestore-triggers.js";

async function main() {
    console.log("\n🚀 Running manual auto-approval...\n");

    try {
        const result = await scanAndApproveExistingBookings();
        console.log("\n✅ Done!");
        console.log(`   Approved: ${result.approvedCount}`);
        console.log(`   Skipped: ${result.skippedCount}`);
        console.log(`   Total: ${result.total}\n`);
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
