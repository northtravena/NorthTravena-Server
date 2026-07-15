/**
 * Diagnostic script to check Firebase bookings status
 * Run with: npx tsx src/scripts/check-bookings.ts
 */

import { db } from "../config/firebase.js";

async function checkBookings() {
    console.log("\n🔍 Checking Firebase Bookings Status...\n");

    try {
        // Get all bookings
        const snapshot = await db.collection("bookings").get();
        console.log(`📊 Total bookings: ${snapshot.size}\n`);

        // Categorize by status and tripType
        const stats: Record<string, Record<string, number>> = {};
        const pendingBookings: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            const status = (data.status as string) || "undefined";
            const tripType = (data.tripType as string) || "undefined";

            // Track pending bookings for detailed analysis
            if (status?.toLowerCase() === "pending") {
                pendingBookings.push({ id: doc.id, data });
            }

            if (!stats[status]) stats[status] = {};
            if (!stats[status][tripType]) stats[status][tripType] = 0;
            stats[status][tripType]++;
        });

        // Display stats
        console.log("📈 Breakdown by Status and Trip Type:");
        console.log("─".repeat(60));
        for (const [status, trips] of Object.entries(stats)) {
            console.log(`\n${status.toUpperCase()}:`);
            for (const [tripType, count] of Object.entries(trips)) {
                console.log(`  - ${tripType}: ${count}`);
            }
        }

        // Analyze pending bookings
        console.log("\n" + "─".repeat(60));
        console.log("\n⚠️  Detailed Pending Bookings Analysis:");
        console.log("─".repeat(60));

        console.log(`\n📝 Found ${pendingBookings.length} pending bookings (case-insensitive search)`);

        if (pendingBookings.length === 0) {
            console.log("\n✅ No pending bookings found at all!");
        } else {
            let foundAutoApproveIssue = false;

            for (const { id, data } of pendingBookings) {
                const tripType = data.tripType as string;
                const normalized = tripType?.toLowerCase().replace(/[_\s-]/g, "");

                console.log(`\n📋 Booking ID: ${id}`);
                console.log(`   Status (raw): "${data.status}"`);
                console.log(`   Trip Type (raw): "${tripType}"`);
                console.log(`   Trip Type (normalized): "${normalized}"`);
                console.log(`   Passenger: ${data.userName || data.userId || "N/A"}`);
                console.log(`   Created: ${data.createdAt || "N/A"}`);

                if (normalized === "oneway" || normalized === "roundtrip") {
                    foundAutoApproveIssue = true;
                    console.log(`   🚨 THIS SHOULD BE AUTO-APPROVED!`);
                } else if (normalized === "monthly") {
                    console.log(`   ✅ Monthly - requires manual admin approval (correct)`);
                } else {
                    console.log(`   ❓ Unknown trip type - check data format`);
                }
            }

            if (foundAutoApproveIssue) {
                console.log("\n" + "─".repeat(60));
                console.log("⚠️  PROBLEM FOUND:");
                console.log("   Pending oneWay/roundTrip bookings exist!");
                console.log("   The Firestore trigger is NOT working properly.");
                console.log("\n💡 SOLUTIONS:");
                console.log("   1. Restart backend server: cd Northtravina-Server && npm run dev");
                console.log("   2. Or use manual trigger in Admin Dashboard");
                console.log("   3. Check server logs for trigger initialization message");
            } else {
                console.log("\n✅ All pending bookings are monthly (correct!)");
            }
        }

        console.log("\n" + "─".repeat(60));
        console.log("✅ Diagnostic complete\n");

    } catch (error) {
        console.error("❌ Error checking bookings:", error);
        process.exit(1);
    }

    process.exit(0);
}

checkBookings();
