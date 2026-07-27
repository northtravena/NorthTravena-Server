/**
 * src/routes/firebaseData.routes.ts
 * Read-only (+ status update) bridge between Firestore and the admin panel.
 * All existing MongoDB routes are untouched.
 */

import { Router, type Request, type Response } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── Lazy-load Firebase so the server still starts if the key is missing ──────
async function getDb() {
  const { db } = await import("../config/firebase.js");
  return db;
}

// ─── Helper: convert a Firestore QuerySnapshot to a plain array ───────────────
function snapshotToArray(snapshot: FirebaseFirestore.QuerySnapshot) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/debug/booking/:id
// Returns the raw booking document + all top-level collection names (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/debug/booking/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Raw booking document
    const doc = await db.collection("bookings").doc(req.params.id).get();
    const bookingData = doc.exists ? { id: doc.id, ...doc.data() } : null;

    // All top-level collection names
    const collections = await db.listCollections();
    const collectionNames = collections.map((c) => c.id);

    // If booking has a vehicleId, try fetching from every collection
    const vehicleId = (bookingData as Record<string, unknown> | null)?.vehicleId as string | undefined;
    const vehicleSearchResults: Record<string, unknown> = {};
    if (vehicleId) {
      for (const col of collectionNames) {
        try {
          const vDoc = await db.collection(col).doc(vehicleId).get();
          if (vDoc.exists) {
            vehicleSearchResults[col] = { id: vDoc.id, ...vDoc.data() };
          }
        } catch {
          // skip
        }
      }
    }

    res.json({
      success: true,
      booking: bookingData,
      allCollections: collectionNames,
      vehicleId,
      vehicleFoundIn: vehicleSearchResults,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Debug failed",
    });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/test
// Test Firebase connection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/test", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    // Try to list collections as a lightweight ping
    const collections = await db.listCollections();
    const names = collections.map((c) => c.id);
    res.json({
      success: true,
      message: "Firebase connected!",
      collections: names,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Firebase connection failed",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/firebase/bookings/auto-approve
// Manually trigger auto-approval of all pending oneWay and roundTrip bookings
// This is a manual trigger for the auto-approval system (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/bookings/auto-approve", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    console.log("🔍 Manual trigger: Scanning for pending oneWay/roundTrip bookings...");

    const snapshot = await db
      .collection("bookings")
      .where("status", "==", "Pending")
      .get();

    let approvedCount = 0;
    let skippedCount = 0;
    const approvedIds: string[] = [];

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const tripType = booking.tripType as string | undefined;

      console.log(`📄 Found booking ${doc.id}: tripType=${tripType}, status=${booking.status}`);

      if (tripType === "oneWay" || tripType === "roundTrip") {
        await doc.ref.update({
          status: "Approved",
          autoApprovedAt: new Date().toISOString(),
          autoApprovedBy: "manual-trigger",
        });
        approvedCount++;
        approvedIds.push(doc.id);
        console.log(`✅ Auto-approved ${tripType} booking: ${doc.id}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped ${tripType || 'unknown'} booking: ${doc.id}`);
      }
    }

    res.json({
      success: true,
      message: `Auto-approval complete: ${approvedCount} approved, ${skippedCount} skipped`,
      approvedCount,
      skippedCount,
      total: snapshot.size,
      approvedIds,
    });
  } catch (err: unknown) {
    console.error("❌ Failed to auto-approve bookings:", err);
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to auto-approve bookings",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/firebase/bookings
// Create a new booking in Firebase Firestore (requires authentication, not admin)
// Auto-approves oneWay and roundTrip, keeps monthly as pending for admin approval
// Body: { passengerId, passengerName, passengerPhone, pickupLocation, dropLocation, 
//         pickupLatitude, pickupLongitude, dropLatitude, dropLongitude, tripType,
//         vehicleType, pickupDateTime, dropDateTime (optional) }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      passengerId,
      passengerName,
      passengerPhone,
      pickupLocation,
      dropLocation,
      pickupLatitude,
      pickupLongitude,
      dropLatitude,
      dropLongitude,
      tripType,
      vehicleType,
      pickupDateTime,
      dropDateTime,
      userId,
      source,
      destination,
      pickupDate,
      pickupTime,
      vehicleId,
    } = req.body as Record<string, unknown>;

    // Validate required fields
    if (!tripType || !pickupLocation || !dropLocation) {
      res.status(400).json({
        success: false,
        message: "tripType, pickupLocation, and dropLocation are required",
      });
      return;
    }

    // New bookings start as Pending.
    const status: string = "Pending";



    // Create booking document
    const bookingData: Record<string, unknown> = {
      passengerId: passengerId || userId || "",
      passengerName: passengerName || "",
      passengerPhone: passengerPhone || "",
      pickupLocation: pickupLocation || source || "",
      dropLocation: dropLocation || destination || "",
      pickupLatitude: pickupLatitude || 0,
      pickupLongitude: pickupLongitude || 0,
      dropLatitude: dropLatitude || 0,
      dropLongitude: dropLongitude || 0,
      tripType,
      vehicleType: vehicleType || vehicleId || "",
      pickupDateTime: pickupDateTime || pickupDate || "",
      pickupTime: pickupTime || "",
      dropDateTime: dropDateTime || null,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await db.collection("bookings").add(bookingData);
    const createdDoc = await docRef.get();

    res.status(201).json({
      success: true,
      data: { id: createdDoc.id, ...createdDoc.data() },
      message: status === "Approved"
        ? "Booking created and auto-approved (available to captains immediately)"
        : "Booking created (pending admin approval)",
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to create booking",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/bookings
// Fetch all bookings and enrich each with user + vehicle data (admin only)
// Query params: ?rideType=one_way | round_trip | monthly (optional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/bookings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rideType = req.query.rideType as string | undefined;

    // Build query with optional ride type filter
    let query: FirebaseFirestore.Query = db.collection("bookings");

    if (rideType) {
      query = query.where("rideType", "==", rideType);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const bookings = snapshotToArray(snapshot) as Array<Record<string, unknown>>;

    // ── 1. Collect unique IDs ─────────────────────────────────────────────────
    const userIds = [
      ...new Set(
        bookings
          .map((b) => b.userId as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];

    const vehicleIds = [
      ...new Set(
        bookings
          .map((b) => b.vehicleId as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];

    // ── 2. Batch-fetch users ──────────────────────────────────────────────────
    const userMap: Record<string, Record<string, unknown>> = {};
    if (userIds.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const refs = chunk.map((uid) => db.collection("users").doc(uid));
        const docs = await db.getAll(...refs);
        docs.forEach((doc) => {
          if (doc.exists) userMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
        });
      }
    }

    // ── 3. Batch-fetch vehicles (try common collection names) ─────────────────
    const vehicleMap: Record<string, Record<string, unknown>> = {};
    if (vehicleIds.length > 0) {
      // Log what we're looking for
      console.log("[Firebase bookings] vehicleIds to resolve:", vehicleIds);

      // Try each candidate collection; use the first one that returns results
      const candidateCollections = ["vehicles", "services", "fleet", "cars", "vehicle", "Vehicles", "Services"];
      for (const colName of candidateCollections) {
        try {
          const chunkSize = 30;
          let found = 0;
          for (let i = 0; i < vehicleIds.length; i += chunkSize) {
            const chunk = vehicleIds.slice(i, i + chunkSize);
            const refs = chunk.map((vid) => db.collection(colName).doc(vid));
            const docs = await db.getAll(...refs);
            docs.forEach((doc) => {
              if (doc.exists) {
                vehicleMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
                found++;
              }
            });
          }
          if (found > 0) {
            console.log(`[Firebase bookings] Found ${found} vehicles in collection: "${colName}"`);
            break;
          } else {
            console.log(`[Firebase bookings] No vehicles found in collection: "${colName}"`);
          }
        } catch (e) {
          console.log(`[Firebase bookings] Collection "${colName}" error:`, (e as Error).message);
          continue;
        }
      }

      if (Object.keys(vehicleMap).length === 0) {
        // Last resort: list all collections and log them so we know the real name
        const allCols = await db.listCollections();
        console.log("[Firebase bookings] All Firestore collections:", allCols.map(c => c.id));
      }
    }

    // ── 3.5. Batch-fetch feedbacks ────────────────────────────────────────────
    const feedbackMap: Record<string, Record<string, unknown>> = {};
    const bookingIds = bookings.map((b) => b.id).filter(Boolean) as string[];
    if (bookingIds.length > 0) {
      const chunkSize = 30;
      try {
        for (let i = 0; i < bookingIds.length; i += chunkSize) {
          const chunk = bookingIds.slice(i, i + chunkSize);
          const fbSnapshot = await db
            .collection("feedbacks")
            .where("booking_id", "in", chunk)
            .get();
          fbSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.booking_id) {
              feedbackMap[data.booking_id] = { id: doc.id, ...data };
            }
          });
        }
      } catch (err) {
        console.error("[Firebase bookings] Failed to batch-fetch feedbacks:", err);
      }
    }

    // ── 3.7. Batch-fetch matched captains ──────────────────────────────────────
    const captainMap: Record<string, Record<string, unknown>> = {};
    const captainIds = [
      ...new Set(
        bookings
          .map((b) => (b.captainId || b.acceptedCaptainId) as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];
    if (captainIds.length > 0) {
      const chunkSize = 30;
      try {
        for (let i = 0; i < captainIds.length; i += chunkSize) {
          const chunk = captainIds.slice(i, i + chunkSize);
          const refs = chunk.map((cid) => db.collection("captains").doc(cid));
          const docs = await db.getAll(...refs);
          docs.forEach((doc) => {
            if (doc.exists) {
              captainMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
            }
          });
        }
      } catch (err) {
        console.error("[Firebase bookings] Failed to batch-fetch captains:", err);
      }
    }

    // ── 4. Enrich bookings ────────────────────────────────────────────────────
    const enriched = bookings.map((b) => {
      const uid = b.userId as string | undefined;
      const vid = b.vehicleId as string | undefined;
      const user = uid ? userMap[uid] : undefined;
      const vehicle = vid ? vehicleMap[vid] : undefined;
      const feedback = b.id ? feedbackMap[b.id as string] : undefined;
      const capId = (b.captainId || b.acceptedCaptainId) as string | undefined;
      const captain = capId ? captainMap[capId] : undefined;

      return {
        ...b,
        // User fields
        ...(user ? {
          userName: user.name ?? user.fullName ?? user.displayName ?? undefined,
          userEmail: user.email ?? undefined,
          userPhone: user.phone ?? user.phoneNo ?? user.phoneNumber ?? undefined,
          _user: user,
        } : {}),
        // Vehicle fields — attach full object so frontend can display all details
        ...(vehicle ? { _vehicle: vehicle } : {}),
        // Feedback/Review fields
        ...(feedback ? { _feedback: feedback } : {}),
        // Matched Captain fields
        ...(captain ? { _captain: captain } : {}),
      };
    });

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch bookings",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/bookings/:id
// Fetch a single booking by Firestore document ID (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/bookings/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const doc = await db.collection("bookings").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }
    
    const bookingData = { id: doc.id, ...doc.data() };
    
    // Fetch associated feedback/review
    let feedback: Record<string, unknown> | null = null;
    try {
      const fbSnapshot = await db
        .collection("feedbacks")
        .where("booking_id", "==", doc.id)
        .limit(1)
        .get();
      if (!fbSnapshot.empty) {
        const fbDoc = fbSnapshot.docs[0];
        feedback = { id: fbDoc.id, ...fbDoc.data() };
      }
    } catch (fbErr) {
      console.error(`[Firebase bookings] Failed to fetch feedback for booking ${doc.id}:`, fbErr);
    }

    // Fetch matched captain details
    let captain: Record<string, unknown> | null = null;
    const capId = ((bookingData as Record<string, any>).captainId || (bookingData as Record<string, any>).acceptedCaptainId) as string | undefined;
    if (capId) {
      try {
        const capDoc = await db.collection("captains").doc(capId).get();
        if (capDoc.exists) {
          captain = { id: capDoc.id, ...capDoc.data() };
        }
      } catch (capErr) {
        console.error(`[Firebase bookings] Failed to fetch captain ${capId} details:`, capErr);
      }
    }

    res.json({
      success: true,
      data: {
        ...bookingData,
        _feedback: feedback,
        _captain: captain,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch booking",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/bookings/:id
// Update the status field of a Firestore booking document (admin only)
// Body: { status: "approved" | "completed" | "cancelled" | "pending" }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/bookings/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status?: string };
    const allowed = ["Approved", "Completed", "Cancelled", "Pending", "approved", "completed", "cancelled", "pending"];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({
        success: false,
        message: `status must be one of: Approved, Completed, Cancelled, Pending`,
      });
      return;
    }
    const db = await getDb();
    const ref = db.collection("bookings").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }
    await ref.update({ status, updatedAt: new Date().toISOString() });
    res.json({ success: true, message: "Booking status updated", id: req.params.id, status });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to update booking",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/user-services
// Fetch all documents from the "user_services" Firestore collection (admin only)
// (services actually booked by users), enriched with user + service data
// ─────────────────────────────────────────────────────────────────────────────
router.get("/user-services", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Try ordering by created_at; fall back to unordered if field missing
    let snapshot: FirebaseFirestore.QuerySnapshot;
    try {
      snapshot = await db.collection("user_services").orderBy("created_at", "desc").get();
    } catch {
      snapshot = await db.collection("user_services").get();
    }
    const userServices = snapshotToArray(snapshot) as Array<Record<string, unknown>>;

    // Collect unique user_ids and service_ids
    const userIds = [
      ...new Set(
        userServices
          .map((s) => s.user_id as string | undefined)
          .filter((id): id is string => !!id && id !== "currentUserId")
      ),
    ];
    const serviceIds = [
      ...new Set(
        userServices
          .map((s) => s.service_id as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];

    // Batch-fetch users
    const userMap: Record<string, Record<string, unknown>> = {};
    if (userIds.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const refs = chunk.map((uid) => db.collection("users").doc(uid));
        const docs = await db.getAll(...refs);
        docs.forEach((doc) => {
          if (doc.exists) userMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
        });
      }
    }

    // Batch-fetch service catalog documents
    const serviceMap: Record<string, Record<string, unknown>> = {};
    if (serviceIds.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < serviceIds.length; i += chunkSize) {
        const chunk = serviceIds.slice(i, i + chunkSize);
        const refs = chunk.map((sid) => db.collection("services").doc(sid));
        const docs = await db.getAll(...refs);
        docs.forEach((doc) => {
          if (doc.exists) serviceMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
        });
      }
    }

    // Enrich each user_service with user + service catalog info
    const enriched = userServices.map((s) => {
      const uid = s.user_id as string | undefined;
      const sid = s.service_id as string | undefined;
      const user = uid ? userMap[uid] : undefined;
      const service = sid ? serviceMap[sid] : undefined;
      return {
        ...s,
        ...(user ? {
          userName: user.name ?? user.fullName ?? user.displayName ?? undefined,
          userEmail: user.email ?? undefined,
          userPhone: user.phone ?? user.phoneNo ?? user.phoneNumber ?? undefined,
          _user: user,
        } : {}),
        ...(service ? { _service: service } : {}),
      };
    });

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch user services",
    });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/notifications
// Fetch all documents from the "notifications" Firestore collection (admin only)
// ordered by createdAt desc, enriched with user name via userId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notifications", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    let snapshot: FirebaseFirestore.QuerySnapshot;
    try {
      snapshot = await db.collection("notifications").orderBy("createdAt", "desc").get();
    } catch {
      snapshot = await db.collection("notifications").get();
    }
    const notifications = snapshotToArray(snapshot) as Array<Record<string, unknown>>;

    // Collect unique userIds
    const userIds = [
      ...new Set(
        notifications
          .map((n) => n.userId as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];

    // Batch-fetch users
    const userMap: Record<string, Record<string, unknown>> = {};
    if (userIds.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const refs = chunk.map((uid) => db.collection("users").doc(uid));
        const docs = await db.getAll(...refs);
        docs.forEach((doc) => {
          if (doc.exists) userMap[doc.id] = { id: doc.id, ...doc.data() } as Record<string, unknown>;
        });
      }
    }

    const enriched = notifications.map((n) => {
      const uid = n.userId as string | undefined;
      const user = uid ? userMap[uid] : undefined;
      return {
        ...n,
        userName: user
          ? (user.name ?? user.fullName ?? user.displayName ?? undefined)
          : undefined,
      };
    });

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch notifications",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/notifications/read-all
// Mark all notifications as read in Firestore (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/notifications/read-all", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("notifications").get();
    
    if (!snapshot.empty) {
      const batchSize = 400;
      let batch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        if (!doc.data().read) {
          batch.update(doc.ref, { read: true, readAt: new Date().toISOString() });
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }
      if (count % batchSize !== 0) {
        await batch.commit();
      }
      console.log(`[Firebase Notifications] Marked ${count} notifications as read in Firestore.`);
    }

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to mark all notifications read",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/notifications/:id/read
// Mark a single notification as read in Firestore (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/notifications/:id/read", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const ref = db.collection("notifications").doc(id);
    const doc = await ref.get();

    if (doc.exists) {
      await ref.update({ read: true, readAt: new Date().toISOString() });
    }

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to mark notification read",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/users
// Fetch all documents from the "users" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("users").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch users",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/rides
// Fetch all documents from the "rides" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rides", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("rides").orderBy("createdAt", "desc").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch rides",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/captains
// Fetch all documents from the "captains" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/captains", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("captains").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch captains",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/users/:id
// Update a passenger (user) document in Firebase Firestore (admin only)
// Used for assigning captains to passengers
// Body: { assignedCaptainId?, assignedCaptainName?, monthlyFee?, matchStatus? }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const db = await getDb();
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Handle captain assignment
    if (req.body.assignedCaptainId !== undefined) {
      if (req.body.assignedCaptainId === null || req.body.assignedCaptainId === "") {
        // Unassign captain
        updateData.assignedCaptainId = null;
        updateData.assignedCaptainName = null;
        updateData.matchStatus = "unmatched";
      } else {
        // Assign captain - fetch captain details
        const captainId = String(req.body.assignedCaptainId);
        const captainDoc = await db.collection("captains").doc(captainId).get();

        if (!captainDoc.exists) {
          res.status(404).json({ success: false, message: "Captain not found" });
          return;
        }

        const captainData = captainDoc.data();
        updateData.assignedCaptainId = captainId;
        updateData.assignedCaptainName = captainData?.fullName || captainData?.name || "Unknown";
        updateData.matchStatus = "matched";
      }
    }

    // Handle monthly fee
    if (req.body.monthlyFee !== undefined) {
      updateData.monthlyFee = Number(req.body.monthlyFee) || 0;
    }

    // Handle residence if provided
    if (req.body.residence) {
      updateData.residence = req.body.residence;
    }

    // Handle workplace if provided
    if (req.body.workplace) {
      updateData.workplace = req.body.workplace;
    }

    await userRef.update(updateData);

    // Fetch and return updated user document
    const updatedDoc = await userRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedData
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to update user",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/captains/:id/approve
// Approve a captain in Firebase (set status to "active") - admin only
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/captains/:id/approve", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const db = await getDb();
    const captainRef = db.collection("captains").doc(captainId);
    const captainDoc = await captainRef.get();

    if (!captainDoc.exists) {
      res.status(404).json({ success: false, message: "Captain not found" });
      return;
    }

    // Update status to active and set approvedAt timestamp
    await captainRef.update({
      status: "active",
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await captainRef.get();
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
      message: "Captain approved successfully"
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to approve captain",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/captains/:id/reject
// Reject a captain in Firebase (set status to "rejected") - admin only
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/captains/:id/reject", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const db = await getDb();
    const captainRef = db.collection("captains").doc(captainId);
    const captainDoc = await captainRef.get();

    if (!captainDoc.exists) {
      res.status(404).json({ success: false, message: "Captain not found" });
      return;
    }

    // Update status to rejected
    await captainRef.update({
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await captainRef.get();
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
      message: "Captain rejected"
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to reject captain",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/wallet-transactions
// Fetch all documents from the "wallet_transactions" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/wallet-transactions", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("wallet_transactions").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch wallet transactions",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/captain-payments
// Fetch all documents from the "captain_payments" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/captain-payments", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("captain_payments").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch captain payments",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/ride-bookings
// Fetch all documents from the "ride_bookings" Firestore collection (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ride-bookings", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection("ride_bookings").get();
    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch ride bookings",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/firebase/captains/:id/topup
// Top up a captain's wallet balance in Firestore (admin only)
// Body: { amount: number, notes?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/captains/:id/topup", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const { amount, notes } = req.body as { amount?: number; notes?: string };
    const topupAmount = Number(amount);

    if (!topupAmount || isNaN(topupAmount) || topupAmount <= 0) {
      res.status(400).json({ success: false, message: "Valid positive amount is required" });
      return;
    }

    const db = await getDb();
    const captainRef = db.collection("captains").doc(captainId);
    const captainDoc = await captainRef.get();

    if (!captainDoc.exists) {
      res.status(404).json({ success: false, message: "Captain not found" });
      return;
    }

    const captainData = captainDoc.data() || {};
    const currentBalance = Number(captainData.walletBalance ?? captainData.wallet ?? 0);
    const newBalance = currentBalance + topupAmount;

    // Update captain wallet balance
    await captainRef.update({
      walletBalance: newBalance,
      wallet: newBalance,
      updatedAt: new Date().toISOString(),
    });

    // Create record in wallet_transactions
    const txRef = await db.collection("wallet_transactions").add({
      captainId,
      captain_id: captainId,
      captainName: captainData.fullName || captainData.name || "Captain",
      amount: topupAmount,
      type: "topup",
      notes: notes || "Wallet top up by admin",
      previousBalance: currentBalance,
      newBalance,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Successfully topped up PKR ${topupAmount}`,
      data: {
        captainId,
        previousBalance: currentBalance,
        newBalance,
        transactionId: txRef.id,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to top up captain wallet",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/firebase/captains/:id/suspend
// Suspend or reinstate a captain in Firestore (admin only)
// Body: { isSuspended: boolean, reason?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/captains/:id/suspend", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const { isSuspended, reason } = req.body as { isSuspended?: boolean; reason?: string };

    if (typeof isSuspended !== "boolean") {
      res.status(400).json({ success: false, message: "isSuspended (boolean) is required" });
      return;
    }

    const db = await getDb();
    const captainRef = db.collection("captains").doc(captainId);
    const captainDoc = await captainRef.get();

    if (!captainDoc.exists) {
      res.status(404).json({ success: false, message: "Captain not found" });
      return;
    }

    const updatePayload: Record<string, unknown> = {
      isSuspended,
      suspended: isSuspended,
      suspensionReason: isSuspended ? (reason || "Suspended by admin") : null,
      suspendedAt: isSuspended ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    await captainRef.update(updatePayload);
    const updatedDoc = await captainRef.get();

    res.json({
      success: true,
      message: isSuspended ? "Captain has been suspended" : "Captain suspension lifted",
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to update suspension status",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/captains/:id/wallet-transactions
// Fetch wallet transactions for a specific captain (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/captains/:id/wallet-transactions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const db = await getDb();

    // Query transactions by captainId or captain_id
    let snapshot = await db.collection("wallet_transactions").where("captainId", "==", captainId).get();
    if (snapshot.empty) {
      snapshot = await db.collection("wallet_transactions").where("captain_id", "==", captainId).get();
    }

    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch captain wallet transactions",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/captains/:id/payable-rides
// Fetch unpaid / payable rides for a specific captain (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/captains/:id/payable-rides", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const db = await getDb();

    let snapshot = await db.collection("ride_bookings").where("captainId", "==", captainId).get();
    if (snapshot.empty) {
      snapshot = await db.collection("ride_bookings").where("captain_id", "==", captainId).get();
    }
    if (snapshot.empty) {
      snapshot = await db.collection("bookings").where("acceptedCaptainId", "==", captainId).get();
    }

    const items = snapshotToArray(snapshot).filter((item: Record<string, unknown>) => {
      const isUnpaid = item.paymentStatus === "unpaid" || item.isPaid === false || item.paid === false;
      return isUnpaid;
    });

    res.json({ success: true, data: items, count: items.length });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch payable rides",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/firebase/captains/:id/payments
// Fetch recorded payment history for a specific captain (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/captains/:id/payments", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const captainId = req.params.id;
    const db = await getDb();

    let snapshot = await db.collection("captain_payments").where("captainId", "==", captainId).get();
    if (snapshot.empty) {
      snapshot = await db.collection("captain_payments").where("captain_id", "==", captainId).get();
    }

    res.json({ success: true, data: snapshotToArray(snapshot), count: snapshot.size });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch captain payments",
    });
  }
});

export default router;

