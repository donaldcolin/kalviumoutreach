/**
 * LeadSquared API Service
 * 
 * Handles all communication with the LeadSquared CRM API.
 * This runs server-side (Node.js) to avoid CORS issues and protect API keys.
 */

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const ACCESS_KEY = process.env.LSQ_ACCESS_KEY || 'u$r52f97f7d830410c0b7c9191072313559';
const SECRET_KEY = process.env.LSQ_SECRET_KEY || '4f263d85fa1ef33374ae16f7f05bcc6f49874f86';

const OUTREACH_ACTIVITY_CODE = 232;

/**
 * Generic LSQ API call
 */
async function lsqFetch(path, method = 'GET', body = null) {
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
    throw new Error(`LSQ API Error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Get all Outreach Activities updated since a given date.
 * Uses the Activity search API with date filtering.
 */
export async function getRecentOutreachActivities(sinceDate) {
  // Since we don't have Administrator access for Advanced Search, we must 
  // fetch leads and then fetch their activities individually.
  const allActivities = [];
  let leads = [];

  try {
    // 1. Fetch all leads (or recently modified leads if we had an optimal parameter)
    const body = {
      Parameter: {
        LookupName: "LeadStage", // arbitrary field to fetch leads
        LookupValue: "",
        SqlOperator: "<>"
      },
      Paging: { PageIndex: 1, PageSize: 100 }
    };
    leads = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', body);
  } catch (err) {
    console.error('Error fetching leads for activities sync:', err.message);
    return [];
  }

  // 2. Fetch activities for each lead
  for (const lead of leads) {
    if (!lead.ProspectID) continue;
    
    // Add a 800ms delay to avoid exceeding LSQ rate limits (15 requests / 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 800));

    const actBody = {
      Parameter: { ActivityEvent: OUTREACH_ACTIVITY_CODE },
      Paging: { Offset: '0', RowCount: '100' },
    };

    try {
      const resp = await lsqFetch(`/v2/ProspectActivity.svc/Retrieve?leadId=${lead.ProspectID}`, 'POST', actBody);
      // API returns { RecordCount, ProspectActivities: [...] }
      const data = resp?.ProspectActivities || (Array.isArray(resp) ? resp : []);
      if (data.length > 0) {
        // Filter by sinceDate manually
        const recentData = data.filter(act => {
          const actDate = new Date(act.CreatedOn || act.ModifiedOn);
          return actDate >= sinceDate;
        });
        allActivities.push(...recentData);
      }
    } catch (err) {
      console.error(`Error fetching activities for lead ${lead.ProspectID}:`, err.message);
    }
  }

  return allActivities;
}

/**
 * Get activities for a specific lead
 */
export async function getActivitiesForLead(leadId) {
  const body = {
    Parameter: {
      ActivityEvent: OUTREACH_ACTIVITY_CODE,
    },
    Paging: {
      Offset: '0',
      RowCount: '100',
    },
  };

  const resp = await lsqFetch(`/v2/ProspectActivity.svc/Retrieve?leadId=${leadId}`, 'POST', body);
  // API returns { RecordCount, ProspectActivities: [...] }
  return resp?.ProspectActivities || (Array.isArray(resp) ? resp : []);
}

/**
 * Get a lead (school) by ID
 */
export async function getLeadById(leadId) {
  return lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${leadId}`);
}

/**
 * Search leads by a field value
 */
export async function searchLeads(fieldName, value) {
  const body = [
    {
      Attribute: fieldName,
      Value: value,
      Condition: 'eq',
    },
  ];
  return lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', body);
}

/**
 * Get all users (associates) from LeadSquared
 */
export async function getLSQUsers() {
  return lsqFetch('/v2/UserManagement.svc/Users.Get');
}

/**
 * Parse the "Data" field from an Outreach Activity into a clean object.
 * The API returns activity-specific fields in a key-value array format.
 */
export function parseOutreachActivity(rawActivity) {
  const data = {};
  
  // Parse the key-value pairs from the Data field
  if (rawActivity.Data) {
    let dataArray;
    if (typeof rawActivity.Data === 'string') {
      try { dataArray = JSON.parse(rawActivity.Data); } catch { dataArray = []; }
    } else {
      dataArray = rawActivity.Data;
    }
    
    if (Array.isArray(dataArray)) {
      dataArray.forEach(item => {
        if (item.Key && item.Value !== undefined) {
          data[item.Key] = item.Value;
        }
      });
    }
  }

  // Map schema names to human-readable fields
  return {
    // Core identifiers
    activityId: rawActivity.Id,
    leadId: rawActivity.RelatedProspectId,
    createdOn: rawActivity.CreatedOn,
    modifiedOn: rawActivity.ModifiedOn,
    
    // Owner (associate)
    ownerEmail: rawActivity.CreatedBy, // email of the user who created this
    
    // Activity data
    notes: data.ActivityEvent_Note || '',
    callConnected: data.Status || '',
    activityType: data.mx_Custom_2 || '', // Walk-in or Seminar
    walkInDateTime: data.mx_Custom_1 || '',
    walkInStatus: data.mx_Custom_4 || '', // RE, FDI, PCI, PI
    typeOfWalkIn: data.mx_Custom_36 || '', // First Visit, Follow-Up, Seminar Visit
    
    // Stage-specific outcomes
    refusedEntryReason: data.mx_Custom_5 || '',
    reasonForRefusedEntry: data.mx_Custom_10 || '',
    statusFrontDesk: data.mx_Custom_7 || '',
    statusPIC: data.mx_Custom_8 || '',
    statusPrincipal: data.mx_Custom_9 || '',
    
    // Contact info captured
    picName: data.mx_Custom_13 || '',
    picEmail: data.mx_Custom_14 || '',
    picPhone: data.mx_Custom_15 || '',
    picDesignation: data.mx_Custom_16 || '',
    principalName: data.mx_Custom_21 || '',
    principalEmail: data.mx_Custom_22 || '',
    principalPhone: data.mx_Custom_23 || '',
    
    // Tracking
    livePhotoUrl: data.mx_Custom_3 || '',
    location: data.mx_Custom_34 || '', // GPS coordinates
    
    // Proposals
    proposalSentToSchool: data.mx_Custom_12 || '',
    proposalSentToPIC: data.mx_Custom_25 || '',
    proposalSentToPrincipal: data.mx_Custom_26 || '',
    
    // Appointments & follow-ups
    picAppointmentDate: data.mx_Custom_17 || '',
    principalAppointmentDate: data.mx_Custom_27 || '',
    followUpDate: data.mx_Custom_6 || '',
    
    // Seminar
    seminarAppointmentDate: data.mx_Custom_18 || '',
    seminarConductedDate: data.mx_Custom_32 || '',
    seminarInterest: data.mx_Custom_18 ? 'Yes' : '',
    
    // School details
    boardOfSchool: data.mx_Custom_37 || '',
    studentStrength: data.mx_Custom_35 || '',
    schoolFees: data.mx_Custom_33 || '',
    
    // Leads generated
    leadsGenerated: data.mx_Custom_19 || '',
    batch2025Leads: data.mx_Custom_28 || '',
    batch2026Leads: data.mx_Custom_29 || '',
    batch2027Leads: data.mx_Custom_30 || '',
    batch2028Leads: data.mx_Custom_31 || '',
    
    // Appointment statuses
    reAppointmentMailSent: data.mx_Custom_11 || '',
    fdiAppointmentMailSent: data.mx_Custom_24 || '',
    
    // Assignment
    assignedExecutive: data.mx_Custom_25 || '',
    executiveEmployeeId: data.mx_Custom_26 || '',
    
    // Streams
    streamsAvailable: data.mx_Custom_28 || '',
  };
}

export default {
  getRecentOutreachActivities,
  getActivitiesForLead,
  getLeadById,
  searchLeads,
  getLSQUsers,
  parseOutreachActivity,
};
