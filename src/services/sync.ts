/**
 * Sync queue manager.
 * Handles offline-to-online synchronization of photos, recordings,
 * and CRM pushes with exponential backoff retry.
 *
 * Queue is persisted to AsyncStorage so pending items survive app kills.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadPhoto, uploadRecording } from './storage';
import { updateVisit, updateMeeting, getVisit, getMeeting, getSchool } from './firestore';
import { crmService } from './crmService';
import type { SyncQueueItem, SyncStatus } from '../types';

const STORAGE_KEY = 'kalvium_sync_queue';

// In-memory mirror of the persisted queue
let syncQueue: SyncQueueItem[] = [];
let isProcessing = false;
let networkUnsubscribe: (() => void) | null = null;
let isInitialized = false;

// ─── Persistence helpers ─────────────────────────────────────────────────────

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(syncQueue));
  } catch (e) {
    console.warn('[Sync] Failed to persist queue:', e);
  }
}

async function loadPersistedQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const items: SyncQueueItem[] = JSON.parse(raw);
      // Merge: any items that were already in-memory (enqueued before init)
      // take priority, then add persisted items that aren't duplicates
      const existingIds = new Set(syncQueue.map(i => i.id));
      const restored = items.filter(i => !existingIds.has(i.id));
      syncQueue = [...syncQueue, ...restored];
      console.log(`[Sync] Restored ${restored.length} queued items from storage`);
    }
  } catch (e) {
    console.warn('[Sync] Failed to load persisted queue:', e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the sync manager.
 * Loads persisted queue and listens for network changes.
 */
export async function initSyncManager(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  await loadPersistedQueue();
  networkUnsubscribe = NetInfo.addEventListener(onNetworkChange);

  // Try processing any restored items immediately
  triggerProcessing();
}

/**
 * Tear down the sync manager.
 */
export function teardownSyncManager(): void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  isInitialized = false;
}

/**
 * Add an item to the sync queue.
 */
export function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'maxAttempts' | 'lastAttempt' | 'status' | 'createdAt'>): void {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    attempts: 0,
    maxAttempts: 5,
    lastAttempt: 0,
    status: 'pending' as SyncStatus,
    createdAt: Date.now(),
  };
  syncQueue.push(queueItem);
  persistQueue(); // fire-and-forget persist
  triggerProcessing();
}

/**
 * Get current queue state.
 */
export function getQueueState(): {
  pending: number;
  failed: number;
  total: number;
  items: SyncQueueItem[];
} {
  const pending = syncQueue.filter((i) => i.status === 'pending').length;
  const failed = syncQueue.filter((i) => i.status === 'failed').length;
  return { pending, failed, total: syncQueue.length, items: [...syncQueue] };
}

/**
 * Retry all failed items.
 */
export function retryFailed(): void {
  syncQueue
    .filter((i) => i.status === 'failed')
    .forEach((i) => {
      i.status = 'pending';
      i.attempts = 0;
    });
  persistQueue();
  triggerProcessing();
}

/**
 * Remove a completed/failed item from the queue.
 */
export function removeFromQueue(itemId: string): void {
  syncQueue = syncQueue.filter((i) => i.id !== itemId);
  persistQueue();
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function onNetworkChange(state: NetInfoState): Promise<void> {
  if (state.isConnected && state.isInternetReachable !== false) {
    triggerProcessing();
  }
}

async function triggerProcessing(): Promise<void> {
  if (isProcessing) return;

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected || netInfo.isInternetReachable === false) return;

  isProcessing = true;

  try {
    const pendingItems = syncQueue.filter((i) => i.status === 'pending');
    for (const item of pendingItems) {
      await processItem(item);
    }
  } finally {
    isProcessing = false;
  }
}

async function processItem(item: SyncQueueItem): Promise<void> {
  // Check exponential backoff timing
  if (item.attempts > 0) {
    const backoffMs = Math.pow(2, item.attempts - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
    const elapsed = Date.now() - item.lastAttempt;
    if (elapsed < backoffMs) return; // Not ready to retry yet
  }

  item.attempts++;
  item.lastAttempt = Date.now();

  try {
    switch (item.type) {
      case 'photo':
        await processPhotoUpload(item);
        break;
      case 'recording':
        await processRecordingUpload(item);
        break;
      case 'crmVisit':
        await processCrmVisit(item);
        break;
      case 'crmMeeting':
        await processCrmMeeting(item);
        break;
      case 'crmAppointment':
        await processCrmAppointment(item);
        break;
    }
    // Success — remove from queue
    item.status = 'synced';
    syncQueue = syncQueue.filter((i) => i.id !== item.id);
    await persistQueue();
  } catch (err) {
    console.warn(`[Sync] Failed to process ${item.type}:`, err);
    if (item.attempts >= item.maxAttempts) {
      item.status = 'failed';
      item.error = err instanceof Error ? err.message : 'Unknown error';
    }
    // Otherwise stays pending for next retry
    await persistQueue();
  }
}

async function processPhotoUpload(item: SyncQueueItem): Promise<void> {
  if (!item.localUri) throw new Error('No local URI for photo');
  const downloadUrl = await uploadPhoto(item.localUri, item.referenceId, 'watermarked');
  await updateVisit(item.referenceId, {
    photoWatermarkedUrl: downloadUrl,
  });
}

async function processRecordingUpload(item: SyncQueueItem): Promise<void> {
  if (!item.localUri) throw new Error('No local URI for recording');
  const downloadUrl = await uploadRecording(item.localUri, item.referenceId);
  await updateMeeting(item.referenceId, {
    recordingUrl: downloadUrl,
  });
}

async function processCrmVisit(item: SyncQueueItem): Promise<void> {
  const visit = await getVisit(item.referenceId);
  if (!visit) throw new Error('Visit not found');
  const result = await crmService.pushVisitActivity(visit);
  if (!result.success) throw new Error(result.message);
  await updateVisit(item.referenceId, { syncedToCrm: true });
}

async function processCrmMeeting(item: SyncQueueItem): Promise<void> {
  const meeting = await getMeeting(item.referenceId);
  if (!meeting) throw new Error('Meeting not found');
  const result = await crmService.pushMeetingActivity(meeting);
  if (!result.success) throw new Error(result.message);
  await updateMeeting(item.referenceId, { syncedToCrm: true });
}

async function processCrmAppointment(_item: SyncQueueItem): Promise<void> {
  // Appointment CRM sync — stub for now
  console.log('[Sync] Appointment CRM sync not yet implemented');
}
