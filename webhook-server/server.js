/**
 * Kalvium Outreach — Webhook Server Entry Point
 *
 * This is the main entry point for Firebase Cloud Functions.
 * All logic is split into modules:
 *   - config.js    → Firebase Admin, env vars, constants
 *   - lsq.js       → LeadSquared API helpers (fetch, parse, build doc)
 *   - sync.js      → LSQ → Firestore sync engine
 *   - routes.js    → Express HTTP routes
 *   - pushQueue.js → Firestore-triggered queue processor
 */

import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { SYNC_INTERVAL_MINUTES } from './config.js';
import { syncActivities } from './sync.js';
import app from './routes.js';
import { handlePushQueue } from './pushQueue.js';

// ─── Export: HTTP API (Express) ─────────────────────────────────────────────
export const api = onRequest({ secrets: ["LSQ_ACCESS_KEY", "LSQ_SECRET_KEY"] }, app);

// ─── Export: Scheduled Cron Sync ────────────────────────────────────────────
export const syncCron = onSchedule({ schedule: `every ${SYNC_INTERVAL_MINUTES} minutes`, secrets: ["LSQ_ACCESS_KEY", "LSQ_SECRET_KEY"] }, async (event) => {
  // Limit automatic sync to IST working hours (08:45 to 18:15) to save API costs
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // UTC + 5:30
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();

  const totalMinutes = hours * 60 + minutes;
  const startMinutes = 8 * 60 + 45; // 08:45
  const endMinutes = 18 * 60 + 15;  // 18:15

  if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
    await syncActivities();
  } else {
    // Only log once an hour to avoid spamming the console overnight
    if (minutes < 5) {
      console.log(`💤 [${now.toISOString()}] Outside working hours (IST ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}). Auto-sync paused.`);
    }
  }
});

// ─── Export: Push Queue Trigger ──────────────────────────────────────────────
export const processPushQueue = onDocumentCreated({ document: "pushQueue/{docId}", secrets: ["LSQ_ACCESS_KEY", "LSQ_SECRET_KEY"] }, handlePushQueue);
