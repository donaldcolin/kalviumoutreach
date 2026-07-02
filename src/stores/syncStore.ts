/**
 * Sync store — tracks pending uploads and sync status for UI indicator.
 */
import { create } from 'zustand';
import type { SyncQueueItem, SyncStatus } from '../types';
import {
  getQueueState,
  retryFailed as retryFailedItems,
  initSyncManager,
  teardownSyncManager,
} from '../services/sync';

// Module-level ref so we can actually clear it
let _syncInterval: ReturnType<typeof setInterval> | null = null;

interface SyncState {
  pendingCount: number;
  failedCount: number;
  totalCount: number;
  items: SyncQueueItem[];
  overallStatus: SyncStatus;
  lastSyncTime: number | null;

  // Actions
  initialize: () => void;
  teardown: () => void;
  refresh: () => void;
  retryFailed: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  totalCount: 0,
  items: [],
  overallStatus: 'synced',
  lastSyncTime: null,

  initialize: () => {
    initSyncManager();

    // Clear any previously leaked interval
    if (_syncInterval) {
      clearInterval(_syncInterval);
      _syncInterval = null;
    }

    // Poll queue state periodically
    _syncInterval = setInterval(() => {
      const state = getQueueState();
      const overallStatus: SyncStatus =
        state.failed > 0 ? 'failed' : state.pending > 0 ? 'pending' : 'synced';
      set({
        pendingCount: state.pending,
        failedCount: state.failed,
        totalCount: state.total,
        items: state.items,
        overallStatus,
        lastSyncTime:
          state.total === 0 ? Date.now() : undefined,
      });
    }, 3000);
  },

  teardown: () => {
    teardownSyncManager();
    if (_syncInterval) {
      clearInterval(_syncInterval);
      _syncInterval = null;
    }
  },

  refresh: () => {
    const state = getQueueState();
    const overallStatus: SyncStatus =
      state.failed > 0 ? 'failed' : state.pending > 0 ? 'pending' : 'synced';
    set({
      pendingCount: state.pending,
      failedCount: state.failed,
      totalCount: state.total,
      items: state.items,
      overallStatus,
    });
  },

  retryFailed: () => {
    retryFailedItems();
    // Refresh after a tick
    setTimeout(() => {
      const state = getQueueState();
      set({
        pendingCount: state.pending,
        failedCount: state.failed,
        totalCount: state.total,
        items: state.items,
        overallStatus: state.pending > 0 ? 'pending' : 'synced',
      });
    }, 100);
  },
}));
