import { Router } from "express";
import { getPublicService, listPublicServices } from "../controllers/service.controller.js";

const router = Router();

router.get("/", listPublicServices);
router.get("/:id", getPublicService);

export default router;
