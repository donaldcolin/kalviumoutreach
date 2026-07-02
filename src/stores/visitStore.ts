/**
 * Visit store — manages current visit and today's visit list.
 */
import { create } from 'zustand';
import type { Visit } from '../types';
import {
  createVisit,
  updateVisit,
  getVisitsForDate,
  onVisitsForDate,
  getHistoricalVisitStats,
} from '../services/firestore';
import { enqueueSync } from '../services/sync';

interface VisitState {
  currentVisit: Visit | null;
  todayVisits: Visit[];
  yesterdayVisitsCount: number;
  allTimeVisitsCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  startVisit: (visitData: Omit<Visit, 'id'>) => Promise<string>;
  completeVisit: (visitId: string) => Promise<void>;
  loadTodayVisits: (executiveId: string) => Promise<void>;
  loadHistoricalStats: (executiveId: string) => Promise<void>;
  subscribeTodayVisits: (executiveId: string) => () => void;
  setCurrentVisit: (visit: Visit | null) => void;
  clearError: () => void;
}

function getTodayRange(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

export const useVisitStore = create<VisitState>((set, get) => ({
  currentVisit: null,
  todayVisits: [],
  yesterdayVisitsCount: 0,
  allTimeVisitsCount: 0,
  isLoading: false,
  error: null,

  startVisit: async (visitData) => {
    set({ isLoading: true, error: null });
    try {
      const visitId = await createVisit(visitData);
      const visit: Visit = { ...visitData, id: visitId };
      set({ currentVisit: visit, isLoading: false });

      // Queue photo upload and CRM sync
      if (visit.watermarkedLocalUri) {
        enqueueSync({
          type: 'photo',
          referenceId: visitId,
          localUri: visit.watermarkedLocalUri,
        });
      }
      enqueueSync({ type: 'crmVisit', referenceId: visitId });

      return visitId;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start visit',
      });
      throw err;
    }
  },

  completeVisit: async (visitId) => {
    try {
      await updateVisit(visitId, { status: 'completed' });
      const { currentVisit } = get();
      if (currentVisit?.id === visitId) {
        set({ currentVisit: { ...currentVisit, status: 'completed' } });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to complete visit',
      });
    }
  },

  loadTodayVisits: async (executiveId) => {
    set({ isLoading: true });
    try {
      const { start, end } = getTodayRange();
      const visits = await getVisitsForDate(executiveId, start, end);
      set({ todayVisits: visits, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load visits',
      });
    }
  },

  loadHistoricalStats: async (executiveId) => {
    try {
      const stats = await getHistoricalVisitStats(executiveId);
      set({ yesterdayVisitsCount: stats.yesterday, allTimeVisitsCount: stats.allTime });
    } catch (err) {
      console.error('Failed to load historical stats', err);
    }
  },

  subscribeTodayVisits: (executiveId) => {
    let currentUnsub: (() => void) | null = null;
    let currentDayStart = 0;

    const subscribe = () => {
      if (currentUnsub) currentUnsub();
      const { start, end } = getTodayRange();
      currentDayStart = start;
      currentUnsub = onVisitsForDate(executiveId, start, end, (visits) => {
        set({ todayVisits: visits });
      });
    };

    subscribe();

    const interval = setInterval(() => {
      const { start: newStart } = getTodayRange();
      if (newStart !== currentDayStart) {
        console.log('[visitStore] Day rolled over, re-subscribing visits...');
        subscribe();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      if (currentUnsub) currentUnsub();
    };
  },

  setCurrentVisit: (visit) => set({ currentVisit: visit }),
  clearError: () => set({ error: null }),
}));
