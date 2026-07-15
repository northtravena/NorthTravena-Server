import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  adminGetBooking,
  adminListBookings,
  adminUpdateBookingStatus,
} from "../controllers/booking.controller.js";
import {
  adminListUserServices,
  adminUpdateUserServiceStatus,
} from "../controllers/userService.controller.js";
import {
  adminCreateService,
  adminDeactivateService,
  adminGetService,
  adminListServices,
  adminUpdateService,
} from "../controllers/service.controller.js";
import { adminCreateServiceType } from "../controllers/serviceType.controller.js";
import { adminUpsertVehicleRate } from "../controllers/vehicleRate.controller.js";
import {
  approveCaptain,
  deleteCaptain,
  getAllCaptains,
  getCaptainById,
  rejectCaptain,
  registerCaptain,
  updateCaptain,
} from "../controllers/captain.controller.js";
import {
  deletePassenger,
  getAllPassengerLocations,
  getAllPassengers,
  getAvailableFirebaseUsers,
  getPassengerById,
  getUnmatchedPassengers,
  registerPassenger,
  updatePassenger,
} from "../controllers/passenger.controller.js";
import { adminGetUser, adminListUsers } from "../controllers/user.controller.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", adminListUsers);
router.get("/users/:id", adminGetUser);

router.post("/captains", registerCaptain);
router.get("/captains", getAllCaptains);
router.get("/captains/:id", getCaptainById);
router.patch("/captains/:id", updateCaptain);
router.delete("/captains/:id", deleteCaptain);
router.patch("/captains/:id/approve", approveCaptain);
router.patch("/captains/:id/reject", rejectCaptain);

router.get("/passengers", getAllPassengers);
router.get("/passengers/unmatched", getUnmatchedPassengers);
router.get("/passengers/all-locations", getAllPassengerLocations);
router.get("/passengers/available-firebase-users", getAvailableFirebaseUsers);
router.post("/passengers", registerPassenger);
router.get("/passengers/:id", getPassengerById);
router.patch("/passengers/:id", updatePassenger);
router.delete("/passengers/:id", deletePassenger);

router.get("/bookings", adminListBookings);
router.get("/bookings/:id", adminGetBooking);
router.patch("/bookings/:id", adminUpdateBookingStatus);

router.get("/user-services", adminListUserServices);
router.patch("/user-services/:id", adminUpdateUserServiceStatus);

router.get("/services", adminListServices);
router.post("/services", adminCreateService);
router.get("/services/:id", adminGetService);
router.patch("/services/:id", adminUpdateService);
router.delete("/services/:id", adminDeactivateService);

router.post("/service-types", adminCreateServiceType);

router.put("/vehicle-rates/:tripType", adminUpsertVehicleRate);

export default router;
