import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { cancelMyBooking, createBooking, listMyBookings } from "../controllers/booking.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMyBookings);
router.post("/", createBooking);
router.patch("/:id/cancel", cancelMyBooking);

export default router;
