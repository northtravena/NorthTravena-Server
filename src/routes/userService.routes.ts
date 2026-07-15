import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  cancelMyUserService,
  createUserService,
  listMyUserServices,
} from "../controllers/userService.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMyUserServices);
router.post("/", createUserService);
router.patch("/:id/cancel", cancelMyUserService);

export default router;
