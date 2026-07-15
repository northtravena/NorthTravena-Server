import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { registerPassenger } from "../controllers/passenger.controller.js";

const router = Router();

// Public passenger registration (requires authentication)
router.post("/register", requireAuth, registerPassenger);

export default router;
