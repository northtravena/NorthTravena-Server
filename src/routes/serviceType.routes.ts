import { Router } from "express";
import { listServiceTypes } from "../controllers/serviceType.controller.js";

const router = Router();

router.get("/", listServiceTypes);

export default router;
