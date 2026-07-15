import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  findNearbyCaptains,
  registerCaptain,
  updateCaptainLiveLocation,
  updateCaptainLocation,
} from "../controllers/captain.controller.js";

const router = Router();

router.post("/register", registerCaptain);
router.get("/nearby", findNearbyCaptains);
router.patch("/:id/location", requireAuth, updateCaptainLocation);
router.patch("/:id/live-location", requireAuth, updateCaptainLiveLocation);

export default router;
