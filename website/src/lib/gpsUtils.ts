/**
 * gpsUtils.ts
 * Client-side GPS route cleaning pipeline for the dashboard.
 *
 * Pipeline order:
 *   1. filterByAccuracy  — drop low-quality pings
 *   2. filterOutliers    — drop statistically impossible jumps
 *   3. smoothRoute       — reduce micro-jitter with sliding average
 */

export interface RawPing {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number | null;
  speed?: number | null;
}

// ─── Haversine ────────────────────────────────────────────────────────────────
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Step 1: Accuracy filter ──────────────────────────────────────────────────
// Drop pings where the GPS chip reported a large uncertainty radius.
export function filterByAccuracy(pings: RawPing[], maxAccuracyMeters = 50): RawPing[] {
  return pings.filter((p) => {
    // If no accuracy field, trust the ping (older data without the field)
    if (p.accuracy == null) return true;
    return p.accuracy <= maxAccuracyMeters;
  });
}

// ─── Step 2: Outlier rejection ────────────────────────────────────────────────
// Drop pings that jump further than `maxJumpMeters` from their neighbors.
// A single bad ping surrounded by good ones gets removed.
export function filterOutliers(pings: RawPing[], maxJumpMeters = 150): RawPing[] {
  if (pings.length <= 2) return pings;

  const result: RawPing[] = [pings[0]];

  for (let i = 1; i < pings.length - 1; i++) {
    const prev = pings[i - 1];
    const curr = pings[i];
    const next = pings[i + 1];

    const distToPrev = haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    const distToNext = haversineMeters(curr.lat, curr.lng, next.lat, next.lng);

    // If this point is far from BOTH neighbors, it's likely a glitch
    if (distToPrev > maxJumpMeters && distToNext > maxJumpMeters) {
      continue; // drop it
    }

    result.push(curr);
  }

  result.push(pings[pings.length - 1]);
  return result;
}

// ─── Step 3: Route smoothing ──────────────────────────────────────────────────
// Apply a sliding window average to reduce micro-jitter.
// windowSize = 3 is a good balance: removes noise without losing real turns.
export function smoothRoute(pings: RawPing[], windowSize = 3): RawPing[] {
  if (pings.length <= windowSize) return pings;

  const half = Math.floor(windowSize / 2);
  return pings.map((ping, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(pings.length - 1, i + half);
    const window = pings.slice(start, end + 1);

    const avgLat = window.reduce((s, p) => s + p.lat, 0) / window.length;
    const avgLng = window.reduce((s, p) => s + p.lng, 0) / window.length;

    return { ...ping, lat: avgLat, lng: avgLng };
  });
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────
export function cleanGpsRoute(pings: RawPing[]): RawPing[] {
  const step1 = filterByAccuracy(pings, 50);
  const step2 = filterOutliers(step1, 150);
  const step3 = smoothRoute(step2, 3);
  return step3;
}

// ─── Cache key ────────────────────────────────────────────────────────────────
// Builds a key that changes whenever new GPS pings arrive (latest ts as buster).
export function buildRouteCacheKey(userId: string, dateStr: string, pings: RawPing[]): string {
  const lastTs = pings.length > 0 ? pings[pings.length - 1].ts : 0;
  return `osrm_route_${userId}_${dateStr}_${lastTs}`;
}
