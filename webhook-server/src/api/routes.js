/**
 * Express Routes
 * HTTP API endpoints served via Firebase Cloud Functions.
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { db, auth, FieldValue } from '../config/config.js';
import { lsqFetch } from '../services/lsq.js';
import { syncActivities, lastSyncResult } from '../services/sync.js';
import { requireAuth } from './authMiddleware.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://kalviumoutreach.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, cron)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Global Rate Limiter: max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

// Strict Rate Limiter for lead search: max 20 requests per 15 minutes
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Search limit exceeded. Please try again later.' }
});

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    lastSync: lastSyncResult,
  });
});

// ─── Manual Sync Trigger ────────────────────────────────────────────────────

app.get('/api/sync-now', requireAuth, (req, res) => {
  console.log('🔔 Manual sync triggered via /api/sync-now (24-hour backfill)');

  // Put-and-forget: Start the heavy sync in the background without `await`
  syncActivities(24).catch(err => {
    console.error('❌ Background manual sync failed:', err);
  });

  // Immediately respond to the frontend so it doesn't pause or timeout
  res.json({
    status: 'Sync started in the background.',
    message: 'Check /api/last-sync in a few minutes for results.'
  });
});

// ─── Last Sync Status ───────────────────────────────────────────────────────

app.get('/api/last-sync', (req, res) => {
  res.json(lastSyncResult);
});

// ─── Create User ────────────────────────────────────────────────────────────

app.post('/api/create-user', requireAuth, async (req, res) => {
  try {
    const { email, password, role, name, phone, regionId, managerId, seniorManagerId } = req.body;
    
    // Only admins can create users
    const callerRole = req.user.role;
    if (callerRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges. Only admins can create users.' });
    }

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Custom Claims are handled automatically by claims.js onDocumentWritten trigger
    // to prevent race conditions.

    // 3. Save profile to Firestore
    const userDoc = {
      email,
      role,
      name: name || '',
      phone: phone || '',
      regionId: regionId || null,
      managerId: managerId || null,
      seniorManagerId: seniorManagerId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    res.json({
      success: true,
      uid: userRecord.uid,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Leads Search ───────────────────────────────────────────────────────────

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    // If not admin/manager, enforce searching own email
    let email = req.query.email;
    const isManager = ['admin', 'regionalManager', 'seniorManager', 'teamLead'].includes(req.user.role);
    
    if (!isManager || !email) {
      email = req.user.email;
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const searchBody = {
      "Parameter": {
        "LookupName": "OwnerIdEmailAddress",
        "LookupValue": email,
        "SqlOperator": "="
      },
      "Columns": {
        "Include_CSV": "ProspectID,FirstName,LastName,EmailAddress,Phone,Company,OwnerIdEmailAddress,mx_Street1,mx_City,mx_State,ProspectStage,Source,ModifiedOn"
      },
      "Paging": {
        "PageIndex": 1,
        "PageSize": 500
      }
    };

    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', searchBody);

    res.json({
      success: true,
      leads: Array.isArray(lsqResp) ? lsqResp : []
    });

  } catch (err) {
    console.error('Failed to fetch leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Push Recording (Legacy HTTP endpoint) ──────────────────────────────────

app.post('/api/push-recording', requireAuth, async (req, res) => {
  try {
    const { activityId, storageUrl, recordingId } = req.body;
    if (!activityId || !storageUrl) {
      return res.status(400).json({ error: 'activityId and storageUrl are required' });
    }

    console.log(`Queuing recording push for activity ${activityId}`);

    // Put-and-forget: Add it to the Firestore queue instead of awaiting the LSQ API here
    await db.collection('pushQueue').add({
      activityId,
      storageUrl,
      recordingId: recordingId || null,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    });

    // Immediately respond to the client so it doesn't pause
    res.json({
      success: true,
      message: 'Push queued to run in the background.'
    });
  } catch (err) {
    console.error('Failed to queue recording push:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Global Lead Search (for Lead Sharing) ──────────────────────────────────



// ─── Global Lead Search (for Lead Sharing) ──────────────────────────────────

app.get('/api/leads/search', requireAuth, searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    let { userEmail } = req.query;
    
    if (!q || String(q).trim().length < 3) {
      return res.status(400).json({ error: 'Search query "q" must be at least 3 characters' });
    }
    
    const isManager = ['admin', 'regionalManager', 'seniorManager', 'teamLead'].includes(req.user.role);
    if (!isManager || !userEmail) {
      userEmail = req.user.email;
    }
    
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail is required for searching' });
    }

    // 1. Get the user's managerId
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found in system' });
    }
    const userData = userSnapshot.docs[0].data();
    const managerId = userData.managerId;

    let teamEmails = [userEmail.toLowerCase()]; // always include self

    // 2. Find all users under the same manager
    if (managerId) {
      const teamSnapshot = await db.collection('users').where('managerId', '==', managerId).get();
      teamSnapshot.forEach(doc => {
        if (doc.data().email) {
          teamEmails.push(doc.data().email.toLowerCase());
        }
      });
    }

    // 3. Search globally using LeadSquared
    const searchBody = {
      "Parameter": {
        "LookupName": "FirstName",
        "LookupValue": String(q).trim(),
        "SqlOperator": "like"
      },
      "Columns": {
        "Include_CSV": "ProspectID,FirstName,LastName,EmailAddress,Phone,Company,OwnerIdEmailAddress,mx_Street1,mx_City,mx_State,ProspectStage"
      },
      "Paging": {
        "PageIndex": 1,
        "PageSize": 1000
      }
    };

    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', searchBody);

    let leads = Array.isArray(lsqResp) ? lsqResp : [];

    // 4. Filter locally for 'School Prospect' AND belonging to the team
    leads = leads.filter(l => {
      const isSchoolProspect = l.ProspectStage === 'School Prospect';
      const ownerEmail = (l.OwnerIdEmailAddress || '').toLowerCase();
      const isTeamLead = teamEmails.includes(ownerEmail);
      return isSchoolProspect && isTeamLead;
    });

    res.json({
      success: true,
      leads
    });

  } catch (err) {
    console.error('Global lead search failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Create Lead (Quick Creation) ───────────────────────────────────────────

let lsqUsersCache = null;
let lsqUsersCacheTime = 0;

async function getLsqOwnerIdByEmail(email) {
  if (!lsqUsersCache || Date.now() - lsqUsersCacheTime > 15 * 60 * 1000) {
    try {
      const users = await lsqFetch('/v2/UserManagement.svc/Users.Get', 'GET');
      if (Array.isArray(users)) {
        lsqUsersCache = users;
        lsqUsersCacheTime = Date.now();
        console.log(`[DEBUG] Fetched ${users.length} LSQ users into cache`);
      } else {
        console.log(`[DEBUG] Failed to parse LSQ users. Response:`, users);
      }
    } catch (err) {
      console.error('Failed to fetch LSQ users for owner mapping:', err);
    }
  }
  
  if (Array.isArray(lsqUsersCache)) {
    const user = lsqUsersCache.find(u => u.EmailAddress && u.EmailAddress.toLowerCase() === email.toLowerCase());
    console.log(`[DEBUG] Mapping email '${email}' -> ID:`, user ? user.ID : 'NOT FOUND');
    return user ? user.ID : null;
  }
  return null;
}

app.post('/api/leads', requireAuth, async (req, res) => {
  try {
    const { schoolName, phone, address, board, studentStrength, city, district, state, latitude, longitude } = req.body;
    let { email } = req.body;

    const isManager = ['admin', 'regionalManager', 'seniorManager', 'teamLead'].includes(req.user.role);
    if (!isManager || !email) {
      email = req.user.email;
    }

    if (!email || !schoolName || !phone) {
      return res.status(400).json({ error: 'Executive email, School Name, and Phone are required' });
    }

    // Pre-check: if phone exists, throw error
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneSearch = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    const searchBody = {
      "Parameter": {
        "LookupName": "Phone",
        "LookupValue": `%${phoneSearch}%`,
        "SqlOperator": "like"
      }
    };
    const existingLeads = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', searchBody);
    if (Array.isArray(existingLeads) && existingLeads.length > 0) {
      return res.status(400).json({ error: 'A lead with this Phone Number already exists.' });
    }

    // Map to LSQ attributes
    const leadBody = [
      { Attribute: "FirstName", Value: schoolName },
      { Attribute: "Phone", Value: phone },
      { Attribute: "mx_Address", Value: address || '' },
      { Attribute: "mx_City", Value: city || '' },
      { Attribute: "mx_District", Value: district || '' },
      { Attribute: "mx_State", Value: state || '' },
      { Attribute: "mx_Board", Value: board || '' },
      { Attribute: "mx_Student_Strength", Value: studentStrength || '' },
      { Attribute: "Source", Value: "School_Outreach_2027" },
      { Attribute: "ProspectStage", Value: "School Prospect" } // Ensure it's marked as School Prospect
    ];

    // Step 1: Create Lead (LeadSquared may override the OwnerId here based on automation rules)
    const ownerId = await getLsqOwnerIdByEmail(email);
    if (ownerId) {
      leadBody.push({ Attribute: "OwnerId", Value: ownerId });
    }
    
    console.log(`[DEBUG] Creating lead for phone ${phone}. OwnerId mapping: ${ownerId}. Payload:`, JSON.stringify(leadBody));

    const lsqResp = await lsqFetch('/v2/LeadManagement.svc/Lead.Create', 'POST', leadBody);

    if (lsqResp.Status === 'Error') {
      console.error('LSQ Create Lead Error:', lsqResp);
      return res.status(400).json({ error: lsqResp.ExceptionMessage || 'Failed to create lead in LSQ' });
    }

    const leadId = lsqResp.Message.Id;

    // Step 2: Log "Outreach Lead Created" Activity (Event 282)
    try {
      const activityBody = {
        "RelatedProspectId": leadId,
        "ActivityEvent": 282,
        "ActivityNote": "Created via Kalvium Outreach Mobile App",
        "Fields": [
          { "SchemaName": "mx_Custom_1", "Value": email },
          { "SchemaName": "mx_Custom_2", "Value": new Date(Date.now() + 5.5 * 3600000).toISOString().replace('T', ' ').substring(0, 19) },
          { "SchemaName": "mx_Custom_3", "Value": latitude || "0.0" },
          { "SchemaName": "mx_Custom_4", "Value": longitude || "0.0" }
        ]
      };
      await lsqFetch('/v2/ProspectActivity.svc/Create', 'POST', activityBody);
    } catch (actErr) {
      console.error('Failed to log Activity 282:', actErr.message || actErr);
    }

    // Step 3: Force Update OwnerId
    if (ownerId) {
      try {
        const updateBody = [{ "Attribute": "OwnerId", "Value": ownerId }];
        await lsqFetch(`/v2/LeadManagement.svc/Lead.Update?leadId=${leadId}`, 'POST', updateBody);
      } catch (updErr) {
        console.error('Failed to force update OwnerId:', updErr.message || updErr);
      }
    }

    // Immediately fetch the created lead to return full details to the app
    let newLeadDetails = {};
    if (leadId && typeof leadId === 'string') {
        try {
            const fetchResp = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${leadId}`, 'GET');
            if (Array.isArray(fetchResp) && fetchResp.length > 0) {
                newLeadDetails = fetchResp[0];
            }
        } catch (fetchErr) {
            console.error('Failed to fetch newly created lead details:', fetchErr);
        }
    }

    res.json({
      success: true,
      leadId: leadId,
      lead: newLeadDetails
    });

  } catch (err) {
    console.error('Create lead failed:', err);
    
    // Parse LSQ Error
    if (err.message.includes('MXDuplicateEntryException')) {
      return res.status(400).json({ error: 'A lead with this Phone Number already exists.' });
    }
    
    // Clean up generic JSON errors for UI
    if (err.message.includes('ExceptionMessage')) {
      try {
        const jsonPart = err.message.substring(err.message.indexOf('{'));
        const lsqErr = JSON.parse(jsonPart);
        if (lsqErr.ExceptionMessage) {
          return res.status(400).json({ error: lsqErr.ExceptionMessage });
        }
      } catch (e) { /* ignore */ }
    }

    res.status(500).json({ error: err.message });
  }
});

// ─── Create Appointment (Secure Endpoint) ──────────────────────────────────

app.post('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { title, date, time, leadId, schoolName, executiveId, type } = req.body;
    
    // Only managers and admins can assign seminars/appointments
    const isManager = ['admin', 'regionalManager', 'seniorManager', 'teamLead'].includes(req.user.role);
    if (!isManager) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to assign appointments.' });
    }

    if (!title || !date || !leadId || !executiveId) {
      return res.status(400).json({ error: 'Missing required fields for appointment.' });
    }

    const appointmentDoc = {
      title,
      date,
      time: time || '10:00 AM',
      leadId,
      schoolName: schoolName || 'Unknown School',
      executiveId,
      type: type || 'seminar',
      status: 'upcoming',
      createdAt: FieldValue.serverTimestamp(),
      assignedBy: req.user.uid,
    };

    const docRef = await db.collection('appointments').add(appointmentDoc);

    res.json({
      success: true,
      appointmentId: docRef.id,
      message: 'Appointment created successfully.'
    });

  } catch (err) {
    console.error('Create appointment failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
