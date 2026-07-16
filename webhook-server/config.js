/**
 * Firebase Admin + Environment Configuration
 * Shared across all server modules.
 */
import fs from 'fs';
import fetch from 'node-fetch';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Global Error Handlers ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error(`🚨 [CRASH PREVENTED] Uncaught Exception:`, err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`🚨 [CRASH PREVENTED] Unhandled Rejection at:`, promise, 'reason:', reason);
});

// ─── Constants & Config ─────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from config.env (Firebase auto-parses .env and .env.local, so we avoid those)
// In production Cloud Functions, env vars and secrets are injected automatically.
dotenv.config({ path: resolve(__dirname, 'config.env') });

export const PORT = process.env.PORT || 3001;
export const LSQ_HOST = 'https://api-in21.leadsquared.com';
export const ACCESS_KEY = process.env.LSQ_ACCESS_KEY;
export const SECRET_KEY = process.env.LSQ_SECRET_KEY;
export const OUTREACH_ACTIVITY_CODE = 232;
export const SYNC_INTERVAL_MINUTES = 5;
export const SYNC_LOOKBACK_MINUTES = 30; // overlap window for safety

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error("❌ WARNING: LSQ_ACCESS_KEY and LSQ_SECRET_KEY are not set. API calls will fail.");
}

// ─── Firebase Admin Setup ───────────────────────────────────────────────────

let fbApp;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Explicit service account JSON (e.g. for local dev outside emulator)
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    fbApp = initializeApp({ credential: cert(serviceAccount) });
  } catch (e) {
    console.error("❌ ERROR: Could not parse FIREBASE_SERVICE_ACCOUNT json.");
    fbApp = initializeApp();
  }
} else {
  // In Cloud Functions, Application Default Credentials are provided automatically.
  // Locally with a service account file, try loading it as a fallback.
  const saPath = resolve(__dirname, '../serviceAccountKey.json');
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    fbApp = initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    // No service account file found — we're likely running in Cloud Functions
    fbApp = initializeApp();
  }
}

export const db = getFirestore(fbApp);

// Re-export FieldValue for convenience
export { FieldValue, fetch };
