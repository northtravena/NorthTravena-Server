/** Map / route booking lifecycle */
export const BOOKING_STATUSES = ["Pending", "Approved", "Completed", "Canceled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** User service request lifecycle (aligns with app filters: Request ≈ Pending) */
export const USER_SERVICE_STATUSES = ["Pending", "Approved", "Cancelled", "Completed"] as const;
export type UserServiceStatus = (typeof USER_SERVICE_STATUSES)[number];

export const TRIP_TYPES = ["oneWay", "roundTrip", "monthly"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const VEHICLE_RATE_TRIP_KEYS = ["one_way", "round", "monthly"] as const;
export type VehicleRateTripKey = (typeof VEHICLE_RATE_TRIP_KEYS)[number];
