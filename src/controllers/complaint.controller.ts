import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Captain } from "../models/captain.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";

// Helper to get Firebase db connection
async function getDb() {
  const { db } = await import("../config/firebase.js");
  return db;
}

// Helper to parse Firestore date/timestamp
function parseFirestoreDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === "function") {
    return val.toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === "string" || typeof val === "number") {
    return new Date(val);
  }
  if (val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  return new Date();
}

export const adminListComplaints = catchAsync(async (_req: Request, res: Response) => {
  const db = await getDb();

  const snapshot = await db.collection("complaints").get();
  const rawComplaints = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<Record<string, any>>;

  const formattedComplaints = [];

  for (const item of rawComplaints) {
    const userId = item.userId ? String(item.userId).trim() : "";
    const captainId = item.captainId ? String(item.captainId).trim() : "";
    const bookingId = item.bookingId ? String(item.bookingId).trim() : "";

    let complainantName = "Unknown Passenger";
    let relatedCaptain = "";
    let relatedPassenger = "";
    let bookingData: any = null;

    // Fetch booking details from Firestore if bookingId is present to resolve captain
    if (bookingId) {
      const firestoreBookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (firestoreBookingDoc.exists) {
        bookingData = firestoreBookingDoc.data();
      }
    }

    // 1. Resolve complainantName (from Firestore or MongoDB)
    if (userId) {
      // Try Firestore "users" collection first (using Firebase UID)
      const firestoreUserDoc = await db.collection("users").doc(userId).get();
      if (firestoreUserDoc.exists) {
        complainantName = firestoreUserDoc.data()?.fullName || firestoreUserDoc.data()?.name || "Unknown Passenger";
      } else if (mongoose.Types.ObjectId.isValid(userId)) {
        // Fallback: Try MongoDB User collection if it's a valid ObjectId
        const mongoUser = await User.findById(userId).lean();
        if (mongoUser) {
          complainantName = mongoUser.fullName;
        }
      }
    }

    // 2. Resolve relatedCaptain (from MongoDB Captains or Firestore Booking)
    if (captainId && mongoose.Types.ObjectId.isValid(captainId)) {
      const mongoCaptain = await Captain.findById(captainId).lean();
      if (mongoCaptain) {
        relatedCaptain = mongoCaptain.fullName;
      }
    }
    // Fallback to Firestore Booking acceptedCaptainName if captainId is empty/unresolved
    if (!relatedCaptain && bookingData) {
      relatedCaptain = bookingData.acceptedCaptainName || bookingData.captainName || "";
    }

    // Classify category into the three frontend UI types
    let complaintType: "passenger-vs-captain" | "captain-vs-passenger" | "tourist-booking" = "passenger-vs-captain";
    const categoryLower = (item.category || "").toLowerCase();
    
    if (categoryLower.includes("tour") || categoryLower.includes("booking") || categoryLower.includes("system")) {
      complaintType = "tourist-booking";
    } else if (item.category === "captain-vs-passenger" || item.byCaptain === true) {
      complaintType = "captain-vs-passenger";
    }

    // 3. Populate relatedPassenger for captain-vs-passenger complaints
    if (complaintType === "captain-vs-passenger") {
      relatedPassenger = complainantName;
      // For captain-vs-passenger, the complainant is the Captain
      if (captainId && mongoose.Types.ObjectId.isValid(captainId)) {
        const mongoCaptain = await Captain.findById(captainId).lean();
        if (mongoCaptain) {
          complainantName = mongoCaptain.fullName;
        }
      } else if (bookingData && bookingData.acceptedCaptainName) {
        complainantName = bookingData.acceptedCaptainName;
      }
    }

    const rawDate = parseFirestoreDate(item.createdAt);

    // Map fields to match UI expectations
    formattedComplaints.push({
      id: item.id,
      type: complaintType,
      category: item.category || "General",
      complainantName,
      timestamp: rawDate.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      description: item.message || "(No description provided)",
      status: item.status || "open",
      relatedCaptain: relatedCaptain || undefined,
      relatedPassenger: relatedPassenger || undefined,
      bookingId: bookingId || undefined,
      rawDate,
    });
  }

  // Sort complaints with "open" first, then by timestamp descending
  formattedComplaints.sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return b.rawDate.getTime() - a.rawDate.getTime();
  });

  res.json({ success: true, data: formattedComplaints, count: formattedComplaints.length });
});

export const adminUpdateComplaintStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const db = await getDb();
  const docRef = db.collection("complaints").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new ApiError(404, "Complaint not found");
  }

  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === "resolved") {
    updates.resolvedAt = new Date().toISOString();
  }

  await docRef.update(updates);

  res.json({ success: true, message: `Complaint status updated to ${status}` });
});
