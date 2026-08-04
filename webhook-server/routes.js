/**
 * Express Routes
 * HTTP API endpoints served via Firebase Cloud Functions.
 */
import express from 'express';
import cors from 'cors';
import { db, auth, FieldValue } from './config.js';
import { lsqFetch } from './lsq.js';
import { syncActivities, lastSyncResult } from './sync.js';

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

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    lastSync: lastSyncResult,
  });
});

// ─── Manual Sync Trigger ────────────────────────────────────────────────────

app.get('/api/sync-now', (req, res) => {
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

app.post('/api/create-user', async (req, res) => {
  try {
    const { email, password, role, name, phone, regionId, managerId, seniorManagerId } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Set Custom Claims based on role
    // This allows Firestore rules to enforce RBAC without reading the users collection
    await auth.setCustomUserClaims(userRecord.uid, { role });

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

app.get('/api/leads', async (req, res) => {
  try {
    const { email } = req.query;
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

app.post('/api/push-recording', async (req, res) => {
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

app.get('/api/leads/search', async (req, res) => {
  try {
    const { q, userEmail } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.status(400).json({ error: 'Search query "q" must be at least 2 characters' });
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

export default app;
