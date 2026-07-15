/**
 * Test script to simulate booking creation and verify auto-approval
 * Run with: npx tsx src/scripts/test-auto-approve.ts
 */

import { db } from "../config/firebase.js";

async function testAutoApproval() {
    console.log("\n🧪 Testing Auto-Approval System...\n");

    try {
        // Create a test oneWay booking with status "Pending"
        console.log("1️⃣ Creating test oneWay booking with status 'Pending'...");

        const testBooking = {
            userId: "TEST_USER_AUTO_APPROVE",
            userName: "Test User",
            userPhone: "+1234567890",
            tripType: "oneWay",
            source: "Test Pickup Location",
            destination: "Test Drop Location",
            pickupDate: "2026-07-15",
            pickupTime: "10:00 AM",
            totalAmount: 500,
            status: "Pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: "AUTO-APPROVAL TEST - DELETE AFTER TESTING",
        };

        const docRef = await db.collection("bookings").add(testBooking);
        console.log(`✅ Test booking created: ${docRef.id}`);
        console.log(`   Status: Pending`);
        console.log(`   Trip Type: oneWay`);

        // Wait for trigger to fire (should be almost instant, but give it 2 seconds)
        console.log("\n2️⃣ Waiting 2 seconds for Firestore trigger to auto-approve...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if status was updated to "Approved"
        console.log("\n3️⃣ Checking if booking was auto-approved...");
        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data();

        if (!updatedData) {
            console.error("❌ Booking not found!");
            process.exit(1);
        }

        console.log(`   Current Status: ${updatedData.status}`);

        if (updatedData.status === "Approved") {
            console.log("\n✅ SUCCESS! Auto-approval is working!");
            console.log(`   Status changed: Pending → Approved`);
            console.log(`   Auto-approved by: ${updatedData.autoApprovedBy || "N/A"}`);
            console.log(`   Auto-approved at: ${updatedData.autoApprovedAt || "N/A"}`);
        } else {
            console.error("\n❌ FAILED! Booking was NOT auto-approved!");
            console.error(`   Expected status: Approved`);
            console.error(`   Actual status: ${updatedData.status}`);
            console.error("\n💡 Possible issues:");
            console.error("   - Firestore trigger is not running");
            console.error("   - Server needs to be restarted");
            console.error("   - Check server console for errors");
        }

        // Clean up: Delete test booking
        console.log("\n4️⃣ Cleaning up test booking...");
        await docRef.delete();
        console.log("✅ Test booking deleted");

        console.log("\n" + "─".repeat(60));
        console.log("🧪 Test complete!\n");

    } catch (error) {
        console.error("\n❌ Test failed with error:", error);
        process.exit(1);
    }

    process.exit(0);
}

testAutoApproval();
