import { ApiError } from "./ApiError.js";

export const createPoint = (lng: number, lat: number) => ({
  type: "Point" as const,
  coordinates: [lng, lat] as [number, number],
});

export function assertLngLatPair(lng: number, lat: number): void {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new ApiError(400, "Coordinates must be numbers [lng, lat]");
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new ApiError(400, "lng must be [-180,180] and lat must be [-90,90]");
  }
}

export function buildRoutePoint(input: { address: string; lat: number; lng: number }): {
  type: "Point";
  coordinates: [number, number];
  address: string;
} {
  assertLngLatPair(input.lng, input.lat);
  const addr = String(input.address ?? "").trim();
  if (!addr) throw new ApiError(400, "Route address is required");
  return {
    ...createPoint(input.lng, input.lat),
    address: addr,
  };
}
