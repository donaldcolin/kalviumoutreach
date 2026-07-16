/**
 * LeadSquared API Helpers
 * - lsqFetch: Authenticated fetch wrapper for LSQ REST API
 * - parseActivityData: Extracts mx_Custom_* fields from various LSQ response formats
 * - buildFirestoreDoc: Converts raw LSQ activity data to a normalized Firestore document
 */
import { LSQ_HOST, ACCESS_KEY, SECRET_KEY, FieldValue, fetch } from './config.js';

// ─── LSQ API Helper ─────────────────────────────────────────────────────────

export async function lsqFetch(path, method = 'GET', body = null) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${LSQ_HOST}${path}${separator}accessKey=${encodeURIComponent(ACCESS_KEY)}&secretKey=${encodeURIComponent(SECRET_KEY)}`;

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LSQ API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Activity Data Parser ───────────────────────────────────────────────────

export function parseActivityData(raw) {
  const data = {};

  // The RetrieveByActivityEvent API returns mx_Custom_ fields directly on the object
  for (const key of Object.keys(raw)) {
    if (key.startsWith('mx_Custom_') || key === 'ActivityEvent_Note') {
      data[key] = raw[key] ?? '';
    }
  }

  // Parse ActivityData field (array of {SchemaName, Value} objects) — used by per-lead API
  if (raw.ActivityData) {
    let arr;
    if (typeof raw.ActivityData === 'string') {
      try { arr = JSON.parse(raw.ActivityData); } catch { arr = []; }
    } else { arr = raw.ActivityData; }
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (item.SchemaName || item.Key) {
          data[item.SchemaName || item.Key] = item.Value ?? item.Attribute ?? '';
        }
      });
    }
  }

  // Also parse Data field (different API versions use different names)
  if (raw.Data) {
    let arr;
    if (typeof raw.Data === 'string') {
      try { arr = JSON.parse(raw.Data); } catch { arr = []; }
    } else { arr = raw.Data; }
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (item.Key) data[item.Key] = item.Value ?? '';
      });
    }
  }

  // Also handle Fields (yet another variant)
  if (raw.Fields && typeof raw.Fields === 'object' && !Array.isArray(raw.Fields)) {
    Object.assign(data, raw.Fields);
  }

  return data;
}

// ─── Build Firestore Document ───────────────────────────────────────────────

export function buildFirestoreDoc(raw, fields, emailToFirestoreId) {
  // CreatedByEmailAddress is the email; CreatedBy is the UUID in the RetrieveByActivityEvent API
  const ownerEmail = (raw.CreatedByEmailAddress || raw.CreatedBy || raw.Owner || '').toLowerCase();
  const firestoreUserId = emailToFirestoreId[ownerEmail] || '';

  // Parse GPS coordinates
  let lat = null, lng = null;
  let address = raw.Address || '';
  const locationStr = fields.mx_Custom_34 || raw.mx_Custom_34 || address;

  if (locationStr) {
    try {
      if (locationStr.includes(',')) {
        const parts = locationStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          lat = parts[0];
          lng = parts[1];
        }
      }

      if (lat === null && locationStr.startsWith('{')) {
        const loc = JSON.parse(locationStr);
        lat = loc.Latitude || loc.lat || null;
        lng = loc.Longitude || loc.lng || null;
      }
    } catch { /* ignore parse errors */ }
  }

  // Fallback to standard LeadSquared location fields if available on the activity
  if (lat === null || lng === null) {
    if (raw.Latitude !== undefined && raw.Longitude !== undefined) {
      lat = parseFloat(raw.Latitude) || null;
      lng = parseFloat(raw.Longitude) || null;
    }
  }

  // Helper to ensure UTC strings have a 'Z' for correct JS parsing in the frontend
  const makeUTC = (dtStr) => {
    if (!dtStr) return '';
    return dtStr.endsWith('Z') ? dtStr : `${dtStr}Z`;
  };

  return {
    // Identifiers
    lsqActivityId: raw.ProspectActivityId || raw.Id || raw.ActivityId || '',
    lsqLeadId: raw.RelatedProspectId || '',
    executiveId: firestoreUserId,
    executiveEmail: ownerEmail,

    // School info
    schoolName: raw.LeadName || raw.ProspectName || '',

    // Visit details
    activityType: fields.mx_Custom_2 || '',
    typeOfWalkIn: fields.mx_Custom_36 || '',
    walkInStatus: fields.mx_Custom_4 || '',
    walkInDateTime: makeUTC(fields.mx_Custom_1 || raw.CreatedOn),
    notes: fields.ActivityEvent_Note || '',

    // Stage outcomes
    refusedEntryReason: fields.mx_Custom_5 || fields.mx_Custom_10 || '',
    statusFrontDesk: fields.mx_Custom_7 || '',
    statusPIC: fields.mx_Custom_8 || '',
    statusPrincipal: fields.mx_Custom_9 || '',

    // Contact info
    picName: fields.mx_Custom_13 || '',
    picPhone: fields.mx_Custom_15 || '',
    picDesignation: fields.mx_Custom_16 || '',
    principalName: fields.mx_Custom_21 || '',
    principalPhone: fields.mx_Custom_23 || '',

    // Location & evidence
    lat,
    lng,
    livePhotoUrl: fields.mx_Custom_3 || '',

    // Proposals
    proposalSentToSchool: fields.mx_Custom_12 || '',
    proposalSentToPIC: fields.mx_Custom_25 || '',
    proposalSentToPrincipal: fields.mx_Custom_26 || '',

    // Follow-ups & appointments
    followUpDate: makeUTC(fields.mx_Custom_6),
    picAppointmentDate: makeUTC(fields.mx_Custom_17),
    principalAppointmentDate: makeUTC(fields.mx_Custom_27),
    seminarAppointmentDate: makeUTC(fields.mx_Custom_18),
    seminarConductedDate: makeUTC(fields.mx_Custom_32),

    // School details
    boardOfSchool: fields.mx_Custom_37 || '',
    studentStrength: fields.mx_Custom_35 || '',
    schoolFees: fields.mx_Custom_33 || '',

    // Leads generated
    leadsGenerated: fields.mx_Custom_19 || '',
    batch2025Leads: fields.mx_Custom_28 || '',
    batch2026Leads: fields.mx_Custom_29 || '',
    batch2027Leads: fields.mx_Custom_30 || '',
    batch2028Leads: fields.mx_Custom_31 || '',

    // Metadata
    source: 'leadsquared',
    lsqCreatedOn: makeUTC(raw.CreatedOn),
    lsqModifiedOn: makeUTC(raw.ModifiedOn),
    syncedAt: FieldValue.serverTimestamp(),
  };
}
