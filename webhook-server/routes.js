/**
 * Express Routes
 * HTTP API endpoints served via Firebase Cloud Functions.
 */
import express from 'express';
import cors from 'cors';
import { db, FieldValue } from './config.js';
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
      callback(null, true); // Allow all for now since it's an internal tool
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
        "Include_CSV": "ProspectID,FirstName,LastName,EmailAddress,Phone,Company,OwnerIdEmailAddress,mx_Street1,mx_City,mx_State"
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

export default app;
