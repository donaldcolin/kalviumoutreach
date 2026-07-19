/**
 * GPS Validation Utilities
 * Validates GPS coordinates before any Firestore write to prevent
 * junk data (NaN, 0/0, out-of-range) from polluting the database.
 */

import { LocationPoint } from '../tracking/locationTracker';

/**
 * Validates that a GPS coordinate pair is within valid ranges.
 * Rejects:
 *  - NaN or Infinity values
 *  - Null island (0, 0) — GPS chips sometimes default here
 *  - Lat outside [-90, 90], Lng outside [-180, 180]
 *  - Timestamps in the far past (before 2020) or future (> 1 hour ahead)
 */
export function isValidPoint(point: LocationPoint): boolean {
  const { lat, lng, ts } = point;

  // Must be finite numbers
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  // Valid coordinate ranges
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  // Reject "null island" (0, 0) — GPS chips sometimes report this on cold start
  if (lat === 0 && lng === 0) return false;

  // Reject impossibly old or future timestamps
  const JAN_2020 = 1577836800000;
  const ONE_HOUR_AHEAD = Date.now() + 60 * 60 * 1000;
  if (ts < JAN_2020 || ts > ONE_HOUR_AHEAD) return false;

  return true;
}

/**
 * Filters an array of LocationPoints, keeping only valid ones.
 * Returns the filtered array and a count of rejected points for logging.
 */
export function validatePoints(points: LocationPoint[]): { valid: LocationPoint[]; rejected: number } {
  const valid = points.filter(isValidPoint);
  return { valid, rejected: points.length - valid.length };
}
