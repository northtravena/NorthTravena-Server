import type { Request, Response } from "express";
import { Passenger, MATCH_STATUSES, type MatchStatus } from "../models/passenger.model.js";
import { User } from "../models/user.model.js";
import { Captain } from "../models/captain.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";
import { parseObjectId } from "../utils/mongoose.js";
import { buildRoutePoint } from "../utils/geo.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

function assertMatchStatus(v: string): asserts v is MatchStatus {
    if (!MATCH_STATUSES.includes(v as MatchStatus)) {
        throw new ApiError(400, `matchStatus must be one of: ${MATCH_STATUSES.join(", ")}`);
    }
}

function parseRouteInput(label: string, raw: unknown): { address: string; lat: number; lng: number } {
    if (!raw || typeof raw !== "object") {
        throw new ApiError(400, `${label} must be an object with address, lat, lng`);
    }
    const o = raw as Record<string, unknown>;
    return {
        address: String(o.address ?? ""),
        lat: Number(o.lat),
        lng: Number(o.lng),
    };
}

export const registerPassenger = catchAsync(async (req: Request, res: Response) => {
    const b = req.body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();

    if (!userId) {
        throw new ApiError(400, "userId is required");
    }

    // Verify user exists
    const user = await User.findById(parseObjectId(userId, "userId"));
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if passenger already exists for this user
    const existing = await Passenger.findOne({ userId });
    if (existing) {
        throw new ApiError(400, "User already registered as passenger");
    }

    const residenceIn = parseRouteInput("residence", b.residence);
    const workplaceIn = parseRouteInput("workplace", b.workplace);
    const residence = buildRoutePoint(residenceIn);
    const workplace = buildRoutePoint(workplaceIn);

    const monthlyFee = Number(b.monthlyFee ?? 0);
    const assignedCaptain = b.assignedCaptain ? String(b.assignedCaptain) : undefined;

    // If captain is assigned, verify it exists
    if (assignedCaptain) {
        const captain = await Captain.findById(parseObjectId(assignedCaptain, "assignedCaptain"));
        if (!captain) {
            throw new ApiError(404, "Assigned captain not found");
        }
    }

    const passenger = await Passenger.create({
        userId,
        residence,
        workplace,
        matchStatus: assignedCaptain ? "matched" : "unmatched",
        assignedCaptain,
        monthlyFee,
    });

    const populated = await Passenger.findById(passenger._id)
        .populate("userId", "fullName email phoneNo")
        .populate("assignedCaptain", "fullName phone routeFrom routeTo")
        .lean({ virtuals: true });

    res.status(201).json({ success: true, data: populated });
});

export const getAllPassengers = catchAsync(async (req: Request, res: Response) => {
    const q: Record<string, unknown> = {};
    const matchStatus = req.query.matchStatus as string | undefined;
    if (matchStatus) {
        assertMatchStatus(matchStatus);
        q.matchStatus = matchStatus;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
        Passenger.find(q)
            .populate("userId", "fullName email phoneNo")
            .populate("assignedCaptain", "fullName phone routeFrom routeTo")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true }),
        Passenger.countDocuments(q),
    ]);

    res.json(paginatedResponse(rows, total, page, limit));
});

export const getPassengerById = catchAsync(async (req: Request, res: Response) => {
    const id = parseObjectId(req.params.id, "passenger id");
    const row = await Passenger.findById(id)
        .populate("userId", "fullName email phoneNo")
        .populate("assignedCaptain", "fullName phone routeFrom routeTo")
        .lean({ virtuals: true });

    if (!row) throw new ApiError(404, "Passenger not found");
    res.json({ success: true, data: row });
});

export const updatePassenger = catchAsync(async (req: Request, res: Response) => {
    const id = parseObjectId(req.params.id, "passenger id");
    const b = req.body as Record<string, unknown>;

    const patch: Record<string, unknown> = {};

    if (b.residence !== undefined) {
        patch.residence = buildRoutePoint(parseRouteInput("residence", b.residence));
    }
    if (b.workplace !== undefined) {
        patch.workplace = buildRoutePoint(parseRouteInput("workplace", b.workplace));
    }
    if (b.matchStatus !== undefined) {
        assertMatchStatus(String(b.matchStatus));
        patch.matchStatus = String(b.matchStatus);
    }
    if (b.assignedCaptain !== undefined) {
        if (b.assignedCaptain === null || b.assignedCaptain === "") {
            patch.assignedCaptain = null;
            patch.matchStatus = "unmatched";
        } else {
            const captainId = parseObjectId(String(b.assignedCaptain), "assignedCaptain");
            const captain = await Captain.findById(captainId);
            if (!captain) {
                throw new ApiError(404, "Assigned captain not found");
            }
            patch.assignedCaptain = captainId;
            patch.matchStatus = "matched";
        }
    }
    if (b.monthlyFee !== undefined) {
        patch.monthlyFee = Number(b.monthlyFee);
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "No fields to update");
    }

    const updated = await Passenger.findByIdAndUpdate(
        id,
        { $set: patch },
        { new: true, runValidators: true },
    )
        .populate("userId", "fullName email phoneNo")
        .populate("assignedCaptain", "fullName phone routeFrom routeTo")
        .lean({ virtuals: true });

    if (!updated) throw new ApiError(404, "Passenger not found");
    res.json({ success: true, data: updated });
});

export const deletePassenger = catchAsync(async (req: Request, res: Response) => {
    const id = parseObjectId(req.params.id, "passenger id");
    const deleted = await Passenger.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, "Passenger not found");
    res.json({ success: true, data: { _id: id } });
});

export const getUnmatchedPassengers = catchAsync(async (_req: Request, res: Response) => {
    const rows = await Passenger.find({ matchStatus: "unmatched" })
        .populate("userId", "fullName email phoneNo")
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });

    res.json({ success: true, data: rows, count: rows.length });
});

export const getAllPassengerLocations = catchAsync(async (_req: Request, res: Response) => {
    const passengers = await Passenger.find()
        .populate("userId", "fullName phoneNo")
        .populate("assignedCaptain", "fullName phone")
        .lean({ virtuals: true });

    const locations = passengers.map((p) => ({
        _id: p._id,
        userId: p.userId,
        residence: p.residence,
        workplace: p.workplace,
        matchStatus: p.matchStatus,
        assignedCaptain: p.assignedCaptain,
    }));

    res.json({ success: true, data: locations, count: locations.length });
});

// ─── Get Available Firebase Users (not yet registered as passengers) ──────────
export const getAvailableFirebaseUsers = catchAsync(async (_req: Request, res: Response) => {
    // Dynamically import Firebase to avoid loading if not configured
    const { db } = await import("../config/firebase.js");

    // Fetch all Firebase users
    const firebaseSnapshot = await db.collection("users").get();
    const firebaseUsers = firebaseSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Array<Record<string, unknown>>;

    // Filter to only users with role "user" (not admin, not captain)
    const regularUsers = firebaseUsers.filter((u) => {
        const role = String(u.role ?? "user").toLowerCase();
        return role === "user";
    });

    // Get all existing passenger records from MongoDB with their user details
    const existingPassengers = await Passenger.find()
        .populate("userId", "email phoneNo")
        .lean();

    // Create sets of emails and phone numbers from existing passengers
    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();

    existingPassengers.forEach((p) => {
        const user = p.userId as any;
        if (user?.email) {
            existingEmails.add(String(user.email).toLowerCase().trim());
        }
        if (user?.phoneNo) {
            existingPhones.add(String(user.phoneNo).replace(/\s+/g, ""));
        }
    });

    // Filter out Firebase users who already have a passenger record
    // Match by email or phone number (since MongoDB and Firebase have different user IDs)
    const availableUsers = regularUsers.filter((u) => {
        const email = String(u.email ?? "").toLowerCase().trim();
        const phone = String(u.phoneNo || u.phone || u.phoneNumber || "").replace(/\s+/g, "");

        // User is already a passenger if their email OR phone matches
        const emailExists = email && existingEmails.has(email);
        const phoneExists = phone && existingPhones.has(phone);

        return !emailExists && !phoneExists;
    });

    res.json({ success: true, data: availableUsers, count: availableUsers.length });
});
