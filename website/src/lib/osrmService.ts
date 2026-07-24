import { calculateDistanceMeters } from './distance';

const CACHE_PREFIX = 'osrm_route_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours max, even if key matches
const CHUNK_SIZE = 70; // OSRM allows 100 max; 70 keeps URLs safe

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
    // Clean up any old osrm_ entries to avoid storage bloat
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX) && k !== key)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify({ route, savedAt: Date.now() }));
  } catch {
    // Storage might be full — silently ignore
  }
}

export async function snapToRoads(rawRoute: [number, number][], signal?: AbortSignal): Promise<[number, number][] | null> {
  if (rawRoute.length < 2) return null;

  // 1. Spatial decimation: remove stationary jitter.
  // Only keep points that are at least 40 meters apart.
  const filteredRoute: [number, number][] = [rawRoute[0]];
  let lastKept = rawRoute[0];
  for (let i = 1; i < rawRoute.length - 1; i++) {
    const pt = rawRoute[i];
    if (calculateDistanceMeters(lastKept[0], lastKept[1], pt[0], pt[1]) >= 40) {
      filteredRoute.push(pt);
      lastKept = pt;
    }
  }
  // Always include the last point
  if (rawRoute.length > 1) {
    filteredRoute.push(rawRoute[rawRoute.length - 1]);
  }

  if (filteredRoute.length < 2) return null;

  // 2. Chunk into groups of CHUNK_SIZE with 1-point overlap
  const chunks: [number, number][][] = [];
  for (let i = 0; i < filteredRoute.length; i += CHUNK_SIZE - 1) {
    const chunk = filteredRoute.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 1) {
      chunks.push(chunk);
    }
  }

  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const coordStr = chunk.map(([lat, lng]) => `${lng},${lat}`).join(';');

        const url =
          `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(10000) });
        if (!res.ok) return [];
        const json = await res.json();

        if (json.code !== 'Ok' || !json.routes?.length) return [];

        const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        return coords;
      })
    );

    const flatCoords = results.flat();
    return flatCoords.length > 0 ? flatCoords : null;
  } catch (error: any) {
    if (error?.name === 'AbortError') return null; // Expected on associate switch
    console.error("OSRM Route Error:", error);
    return null;
  }
}
