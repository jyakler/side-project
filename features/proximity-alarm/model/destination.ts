export type LatLng = { lat: number; lng: number };

export type Destination = LatLng & {
  id: string;
  name: string;
  /** Alarm radius in meters. */
  radius: number;
};

export const MIN_RADIUS = 50;
export const MAX_RADIUS = 5000;

export function isValidRadius(radius: number) {
  return Number.isFinite(radius) && radius >= MIN_RADIUS && radius <= MAX_RADIUS;
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
