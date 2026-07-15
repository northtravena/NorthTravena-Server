import { Router } from "express";
import { listVehicleRates } from "../controllers/vehicleRate.controller.js";

const router = Router();

router.get("/", listVehicleRates);

export default router;
