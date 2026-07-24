import { calculateDistanceMeters } from './distance';

export interface LocationRequest {
  status: string;
  requestedAt?: any;
  [key: string]: any;
}

export interface CrmActivity {
  walkInDateTime?: string;
  lsqCreatedOn?: string;
  walkInStatus?: string;
  schoolName?: string;
  typeOfWalkIn?: string;
  lat?: number;
  lng?: number;
  startLocation?: { lat: number; lng: number };
  createdAt?: any;
  [key: string]: any;
}

export interface RawPing {
  ts: any;
  [key: string]: any;
}

export function buildTimeline(
  selectedDateLocReqs: LocationRequest[],
  selectedDateCrmActivities: CrmActivity[],
  rawPings: RawPing[]
) {
  const merged: any[] = [];

  selectedDateLocReqs.forEach((r) => {
    const ts = r.requestedAt?.toMillis ? r.requestedAt.toMillis() : r.requestedAt || Date.now();
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
    const prevTs = prev.ts?.toMillis ? prev.ts.toMillis() : prev.ts || 0;
    const currTs = curr.ts?.toMillis ? curr.ts.toMillis() : curr.ts || 0;

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
  const finalTimeline: any[] = [];
  let lastLoc: { lat: number; lng: number; timestamp: number } | null = null;

  merged.forEach((item) => {
    // 1. Short Duration Warning for CRM activities
    if (item.type === 'crm' && item.data) {
      const a = item.data;
      const walkInTs = a.walkInDateTime ? new Date(a.walkInDateTime).getTime() : 0;
      const createdTs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
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
