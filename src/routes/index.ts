import { Router } from "express";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import bookingRoutes from "./booking.routes.js";
import captainRoutes from "./captain.routes.js";
import firebaseDataRoutes from "./firebaseData.routes.js";
import healthRoutes from "./health.routes.js";
import notificationRoutes from "./notification.routes.js";
import passengerRoutes from "./passenger.routes.js";
import serviceRoutes from "./service.routes.js";
import serviceTypeRoutes from "./serviceType.routes.js";
import userRoutes from "./user.routes.js";
import userServiceRoutes from "./userService.routes.js";
import vehicleRateRoutes from "./vehicleRate.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/captains", captainRoutes);
router.use("/passengers", passengerRoutes);
router.use("/bookings", bookingRoutes);
router.use("/user-services", userServiceRoutes);
router.use("/services", serviceRoutes);
router.use("/service-types", serviceTypeRoutes);
router.use("/vehicle-rates", vehicleRateRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);
router.use("/firebase", firebaseDataRoutes);

export default router;
