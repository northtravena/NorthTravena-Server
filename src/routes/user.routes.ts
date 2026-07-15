import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { updateUserLocation } from "../controllers/user.controller.js";

const router = Router();

router.patch("/location", requireAuth, updateUserLocation);

export default router;
