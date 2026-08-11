import { calculateDistanceMeters } from './distance';
import type { CrmActivity } from '@kalvium-outreach/shared';
import type { RawPing } from './gpsUtils';

export interface LocationRequest {
  status: string;
  requestedAt?: { toMillis?: () => number } | number;
  [key: string]: unknown;
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: 'request' | 'crm' | 'warning' | 'visit' | 'ping';
  status?: string;
  timestamp: number;
  data?: CrmActivity | LocationRequest | RawPing;
  lat?: number | null;
  lng?: number | null;
  details?: string;
  isWarning?: boolean;
}

export function buildTimeline(
  selectedDateLocReqs: LocationRequest[],
  selectedDateCrmActivities: CrmActivity[],
  rawPings: RawPing[]
): TimelineEvent[] {
  const merged: TimelineEvent[] = [];

  selectedDateLocReqs.forEach((r) => {
    const req = r.requestedAt;
    const ts = (req && typeof req === 'object' && 'toMillis' in req && typeof req.toMillis === 'function') ? req.toMillis() : (typeof req === 'number' ? req : Date.now());
    const date = new Date(ts);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    merged.push({
      time: timeStr,
      event: `Location Request (${r.status})`,
      type: 'request',
      status: r.status,
      timestamp: ts,
      data: r,
    });
  });

  selectedDateCrmActivities.forEach((a) => {
    const dt = a.walkInDateTime || a.lsqCreatedOn;
    const ts = dt ? new Date(dt).getTime() : Date.now();
    const date = new Date(ts);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const stageLabel = a.walkInStatus || 'Visit';
    let eventText = `📋 ${a.schoolName || 'School'} — ${stageLabel}`;
    if (a.typeOfWalkIn) eventText = `📋 ${a.typeOfWalkIn}: ${a.schoolName || 'School'} (${stageLabel})`;

    merged.push({
      time: timeStr,
      event: eventText,
      type: 'crm',
      lat: a.lat ?? a.startLocation?.lat ?? null,
      lng: a.lng ?? a.startLocation?.lng ?? null,
      timestamp: ts,
      status: a.walkInStatus,
      data: a,
    });
  });

  // 3. GPS Signal Lost Gaps
  for (let i = 1; i < rawPings.length; i++) {
    const prev = rawPings[i - 1];
    const curr = rawPings[i];
    
    if (!prev.ts || !curr.ts || prev.ts === 0 || curr.ts === 0) continue;

    const prevTs = prev.ts;
    const currTs = curr.ts;

    const gapMs = currTs - prevTs;
    if (gapMs > 3600000) {
      // > 1 hour gap
      const date = new Date(currTs);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const gapMins = Math.round(gapMs / 60000);
      merged.push({
        time: timeStr,
        event: 'GPS Signal Lost',
        details: `No background location data received for ${
          gapMins > 120 ? Math.round(gapMins / 60) + ' hours' : gapMins + ' minutes'
        }`,
        type: 'warning',
        timestamp: currTs - 1000,
        isWarning: true,
      });
    }
  }

  merged.sort((a, b) => a.timestamp - b.timestamp);

  // Anti-Cheat: Impossible Travel & Short Duration
  const finalTimeline: TimelineEvent[] = [];
  let lastLoc: { lat: number; lng: number; timestamp: number } | null = null;

  merged.forEach((item) => {
    // 1. Short Duration Warning for CRM activities
    if (item.type === 'crm' && item.data) {
      const a = item.data as CrmActivity;
      const walkInTs = a.walkInDateTime ? new Date(a.walkInDateTime).getTime() : 0;
      const createdTs = (a.createdAt as { toMillis?: () => number })?.toMillis ? (a.createdAt as { toMillis: () => number }).toMillis() : 0;
      if (walkInTs > 0 && createdTs > 0) {
        const durationMs = createdTs - walkInTs;
        if (
          durationMs > 0 &&
          durationMs < 180000 &&
          (a.walkInStatus?.includes('PI') ||
            a.walkInStatus?.includes('Principal') ||
            a.walkInStatus?.includes('Seminar'))
        ) {
          finalTimeline.push({
            time: item.time,
            event: 'Suspiciously Short Duration',
            details: `Principal Interaction lasted only ${Math.round(durationMs / 1000)}s`,
            type: 'warning',
            timestamp: item.timestamp - 1,
            isWarning: true,
          });
        }
      }
    }

    // 2. Impossible Travel
    if (item.lat && item.lng && item.timestamp) {
      if (lastLoc) {
        const distMeters = calculateDistanceMeters(lastLoc.lat, lastLoc.lng, item.lat, item.lng);
        const timeHours = (item.timestamp - lastLoc.timestamp) / 3600000;
        if (timeHours > 0) {
          const speedKmh = distMeters / 1000 / timeHours;
          if (speedKmh > 100) {
            finalTimeline.push({
              time: item.time,
              event: 'Impossible Travel Detected',
              details: `Speed ~${Math.round(speedKmh)} km/h between check-ins (${(distMeters / 1000).toFixed(
                1
              )}km in ${Math.round(timeHours * 60)}m)`,
              type: 'warning',
              timestamp: item.timestamp - 1,
              isWarning: true,
            });
          }
        }
      }
      lastLoc = { lat: item.lat, lng: item.lng, timestamp: item.timestamp };
    }

    finalTimeline.push(item);
  });

  return finalTimeline;
}
