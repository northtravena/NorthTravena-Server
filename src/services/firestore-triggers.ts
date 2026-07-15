/**
 * Firestore Triggers - Auto-approve oneWay and roundTrip bookings
 * 
 * This service monitors Firestore bookings collection and automatically
 * approves oneWay and roundTrip bookings when they are created with status "pending"
 */

import { db } from "../config/firebase.js";

/**
 * Initialize Firestore listener to auto-approve oneWay and roundTrip bookings
 * This runs continuously to monitor new bookings
 */
export function initializeFirestoreTriggers() {
    console.log("🔥 Initializing Firestore booking auto-approval triggers...");

    // Listen to bookings collection for new documents with status "Pending" (note: Firebase uses capital P)
    const unsubscribe = db
        .collection("bookings")
        .where("status", "==", "Pending")
        .onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === "added") {
                        const booking = change.doc.data();
                        const bookingId = change.doc.id;
                        const tripType = booking.tripType as string | undefined;

                        console.log(`📥 New pending booking detected: ${bookingId}, tripType: ${tripType}`);

                        // Auto-approve oneWay and roundTrip, keep monthly as pending
                        if (tripType === "oneWay" || tripType === "roundTrip") {
                            try {
                                await change.doc.ref.update({
                                    status: "Approved",
                                    autoApprovedAt: new Date().toISOString(),
                                    autoApprovedBy: "system",
                                });

                                console.log(
                                    `✅ Auto-approved ${tripType} booking: ${bookingId}`
                                );
                            } catch (err) {
                                console.error(
                                    `❌ Failed to auto-approve booking ${bookingId}:`,
                                    err
                                );
                            }
                        } else if (tripType === "monthly") {
                            console.log(
                                `ℹ️  Monthly booking ${bookingId} requires manual admin approval`
                            );
                        } else {
                            console.log(
                                `⚠️  Unknown tripType "${tripType}" for booking ${bookingId}`
                            );
                        }
                    }
                });
            },
            (error) => {
                console.error("❌ Firestore listener error:", error);
            }
        );

    // Return unsubscribe function in case we need to stop the listener
    return unsubscribe;
}

/**
 * Manually scan and approve any existing pending oneWay/roundTrip bookings
 * This is useful for initial setup or recovering from errors
 */
export async function scanAndApproveExistingBookings() {
    console.log("🔍 Scanning for existing pending oneWay/roundTrip bookings...");

    try {
        const snapshot = await db
            .collection("bookings")
            .where("status", "==", "Pending")
            .get();

        let approvedCount = 0;
        let skippedCount = 0;

        for (const doc of snapshot.docs) {
            const booking = doc.data();
            const tripType = booking.tripType as string | undefined;

            if (tripType === "oneWay" || tripType === "roundTrip") {
                await doc.ref.update({
                    status: "Approved",
                    autoApprovedAt: new Date().toISOString(),
                    autoApprovedBy: "system-scan",
                });
                approvedCount++;
                console.log(`✅ Auto-approved ${tripType} booking: ${doc.id}`);
            } else {
                skippedCount++;
            }
        }

        console.log(
            `✅ Scan complete: ${approvedCount} approved, ${skippedCount} skipped (monthly or unknown)`
        );

        return { approvedCount, skippedCount, total: snapshot.size };
    } catch (err) {
        console.error("❌ Failed to scan bookings:", err);
        throw err;
    }
}
