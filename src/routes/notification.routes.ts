import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listMyNotifications, markNotificationRead } from "../controllers/notification.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMyNotifications);
router.patch("/:id/read", markNotificationRead);

export default router;
