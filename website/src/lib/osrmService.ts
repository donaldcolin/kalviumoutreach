import { calculateDistanceMeters } from './distance';

const CACHE_PREFIX = 'osrm_v7_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ORS_CHUNK_SIZE = 100; // ORS allows up to 100 coords per /matching request
const OSRM_CHUNK_SIZE = 70; // OSRM /route fallback

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY as string;

export function readCache(key: string): [number, number][] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { route, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return route;
  } catch {
    return null;
  }
}

export function writeCache(key: string, route: [number, number][]) {
  try {
    // Clean up all old osrm_ cache entries to avoid storage bloat
    Object.keys(localStorage)
      .filter(k => k.startsWith('osrm_') && k !== key)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify({ route, savedAt: Date.now() }));
  } catch {
    // Storage might be full — silently ignore
  }
}

// ─── Spatial Decimation ────────────────────────────────────────────────────────
// Remove stationary jitter: only keep points >= minDistMeters from the last kept.
function decimateRoute(rawRoute: [number, number][], minDistMeters: number): [number, number][] {
  if (rawRoute.length < 2) return rawRoute;
  const result: [number, number][] = [rawRoute[0]];
  let lastKept = rawRoute[0];
  for (let i = 1; i < rawRoute.length - 1; i++) {
    const pt = rawRoute[i];
    if (calculateDistanceMeters(lastKept[0], lastKept[1], pt[0], pt[1]) >= minDistMeters) {
      result.push(pt);
      lastKept = pt;
    }
  }
  result.push(rawRoute[rawRoute.length - 1]);
  return result;
}

// ─── ORS Map Matching ─────────────────────────────────────────────────────────
// Uses OpenRouteService /matching which applies a Hidden Markov Model to snap
// GPS traces to the roads most likely driven — handles GPS noise naturally.
async function tryORSMatch(route: [number, number][], signal: AbortSignal): Promise<[number, number][] | null> {
  if (!ORS_API_KEY) return null;

  // Chunk into ORS_CHUNK_SIZE with 1-point overlap
  const chunks: [number, number][][] = [];
  for (let i = 0; i < route.length; i += ORS_CHUNK_SIZE - 1) {
    const chunk = route.slice(i, i + ORS_CHUNK_SIZE);
    if (chunk.length > 1) chunks.push(chunk);
  }

  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        // ORS expects [lng, lat] order
        const coordinates = chunk.map(([lat, lng]) => [lng, lat]);

        const res = await fetch('https://api.openrouteservice.org/v2/matching/driving-car/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ coordinates }),
          signal,
        });

        if (!res.ok) {
          console.warn(`[ORS] /matching failed: ${res.status}`);
          return null;
        }

        const json = await res.json();
        if (!json.features?.length) return null;

        // ORS returns GeoJSON FeatureCollection; first feature has the matched route
        const coords = json.features[0]?.geometry?.coordinates;
        if (!coords?.length) return null;

        // Convert [lng, lat] → [lat, lng]
        return coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
      })
    );

    if (results.some(r => r === null)) {
      console.warn('[ORS] Some chunks failed, falling back to OSRM /route');
      return null;
    }

    const flat = results.flat() as [number, number][];
    console.log(`[ORS] /matching succeeded: ${flat.length} coords`);
    return flat.length > 0 ? flat : null;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    console.warn('[ORS] /matching error:', err);
    return null;
  }
}

// ─── OSRM /route Fallback ─────────────────────────────────────────────────────
async function tryOSRMRoute(route: [number, number][], signal: AbortSignal): Promise<[number, number][] | null> {
  const chunks: [number, number][][] = [];
  for (let i = 0; i < route.length; i += OSRM_CHUNK_SIZE - 1) {
    const chunk = route.slice(i, i + OSRM_CHUNK_SIZE);
    if (chunk.length > 1) chunks.push(chunk);
  }

  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const coordStr = chunk.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url =
          `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url, { signal });
        if (!res.ok) return [];
        const json = await res.json();
        if (json.code !== 'Ok' || !json.routes?.length) return [];

        return json.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
      })
    );

    const flat = results.flat();
    return flat.length > 0 ? flat : null;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    return null;
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────
/**
 * Snap GPS pings to actual roads.
 * Strategy: Try ORS /matching first (accurate HMM-based), fall back to OSRM /route.
 */
export async function snapToRoads(rawRoute: [number, number][], signal?: AbortSignal): Promise<[number, number][] | null> {
  if (rawRoute.length < 2) return null;

  const abortSignal = signal ?? AbortSignal.timeout(15000);

  // Spatial decimation: remove stationary jitter (>= 40m apart)
  const filtered = decimateRoute(rawRoute, 40);
  if (filtered.length < 2) return null;

  // 1. Try ORS map matching (best quality — uses Hidden Markov Model)
  const orsResult = await tryORSMatch(filtered, abortSignal);
  if (orsResult) return orsResult;

  // 2. Fall back to OSRM /route (always works, occasional side-street jogs)
  console.log('[OSRM] Using /route fallback');
  return tryOSRMRoute(filtered, abortSignal);
}
