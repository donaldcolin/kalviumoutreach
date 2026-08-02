import { create } from 'zustand';
import { Toast } from '@/components/ui/ToastManager';
import firestore from '@react-native-firebase/firestore';
import type { Task } from '../types';

// ─── Date helpers ────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function categorizeTasks(docs: Task[]): {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  completed: Task[];
} {
  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const overdue: Task[] = [];
  const today: Task[] = [];
  const upcoming: Task[] = [];
  const completed: Task[] = [];

  // Deduplicate obsolete pending tasks
  const latestPendingBySchool = new Map<string, number>();
  docs.forEach(task => {
    if (task.status !== 'completed' && task.date) {
      const key = (task.schoolName || '').toLowerCase().trim();
      const time = new Date(task.date).getTime();
      const current = latestPendingBySchool.get(key) || 0;
      if (time > current) {
        latestPendingBySchool.set(key, time);
      }
    }
  });

  const validDocs = docs.filter(task => {
    if (task.status === 'completed' || !task.date) return true;
    const key = (task.schoolName || '').toLowerCase().trim();
    const latestTime = latestPendingBySchool.get(key);
    const time = new Date(task.date).getTime();
    if (latestTime && time < latestTime) return false;
    return true;
  });

  for (const task of validDocs) {
    if (task.status === 'completed') {
      completed.push(task);
      continue;
    }

    // Skip snoozed tasks — manager has hidden them until a future date
    if (task.snoozedUntil && new Date(task.snoozedUntil) > now) {
      continue;
    }

    // Pending task — categorize by date
    if (!task.date) {
      // No date set → treat as upcoming
      upcoming.push(task);
      continue;
    }

    const taskDate = new Date(task.date);

    if (taskDate < todayStart) {
      overdue.push(task);
    } else if (taskDate <= todayEnd) {
      today.push(task);
    } else {
      upcoming.push(task);
    }
  }

  // Sort overdue: most overdue first (oldest date first)
  overdue.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // Sort today: earliest time first
  today.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // Sort upcoming: nearest date first
  upcoming.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Infinity;
    const dateB = b.date ? new Date(b.date).getTime() : Infinity;
    return dateA - dateB;
  });

  // Sort completed: most recent first
  completed.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return { overdue, today, upcoming, completed };
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface TasksState {
  overdueTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  completedTasks: Task[];
  isLoading: boolean;
  isRefreshing: boolean;
  _currentUserId: string | null;
  _unsubscribe: (() => void) | null;

  /** Convenience getters */
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  /** All pending tasks (overdue + today + upcoming) */
  pendingTasks: Task[];

  initialize: (userId: string) => void;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  cleanup: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  overdueTasks: [],
  todayTasks: [],
  upcomingTasks: [],
  completedTasks: [],
  isLoading: true,
  isRefreshing: false,
  _currentUserId: null,
  _unsubscribe: null,

  overdueCount: 0,
  todayCount: 0,
  upcomingCount: 0,
  pendingTasks: [],

  initialize: (userId: string) => {
    const state = get();

    // Already subscribed for this user
    if (state._currentUserId === userId && state._unsubscribe) {
      return;
    }

    // Clean up any existing listener
    if (state._unsubscribe) {
      state._unsubscribe();
    }

    set({ isLoading: true, _currentUserId: userId });

    const unsubscribe = firestore()
      .collection('appointments')
      .where('executiveId', '==', userId)
      .onSnapshot(
        (snapshot: { docs: any[]; }) => {
          const allTasks: Task[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Task[];

          const { overdue, today, upcoming, completed } = categorizeTasks(allTasks);

          set({
            overdueTasks: overdue,
            todayTasks: today,
            upcomingTasks: upcoming,
            completedTasks: completed,
            overdueCount: overdue.length,
            todayCount: today.length,
            upcomingCount: upcoming.length,
            pendingTasks: [...overdue, ...today, ...upcoming],
            isLoading: false,
            isRefreshing: false,
          });
        },
        (error: any) => {
          console.error('Tasks snapshot error:', error);
          set({ isLoading: false, isRefreshing: false });
        },
      );

    set({ _unsubscribe: unsubscribe });
  },

  refresh: async () => {
    const { _currentUserId } = get();
    if (!_currentUserId) return;

    set({ isRefreshing: true });

    try {
      const snapshot = await firestore()
        .collection('appointments')
        .where('executiveId', '==', _currentUserId)
        .get();

      const allTasks: Task[] = snapshot.docs.map((d: { id: any; data: () => any; }) => ({
        id: d.id,
        ...d.data(),
      })) as Task[];

      const { overdue, today, upcoming, completed } = categorizeTasks(allTasks);

      set({
        overdueTasks: overdue,
        todayTasks: today,
        upcomingTasks: upcoming,
        completedTasks: completed,
        overdueCount: overdue.length,
        todayCount: today.length,
        upcomingCount: upcoming.length,
        pendingTasks: [...overdue, ...today, ...upcoming],
        isRefreshing: false,
      });
    } catch (err) {
      console.error('Tasks refresh error:', err);
      set({ isRefreshing: false });
    }
  },

  completeTask: async (taskId: string) => {
    try {
      await firestore().collection('appointments').doc(taskId).update({
        status: 'completed',
        completedAt: firestore.FieldValue.serverTimestamp(),
      });
      // Real-time listener will automatically update the lists
    } catch (err) {
      console.error('Failed to complete task', err);
      Toast.show({
        title: 'Error',
        message: 'Failed to complete task. Please try again.',
        type: 'error',
      });
    }
  },

  cleanup: () => {
    const { _unsubscribe } = get();
    if (_unsubscribe) {
      _unsubscribe();
    }
    set({
      overdueTasks: [],
      todayTasks: [],
      upcomingTasks: [],
      completedTasks: [],
      pendingTasks: [],
      overdueCount: 0,
      todayCount: 0,
      upcomingCount: 0,
      _currentUserId: null,
      _unsubscribe: null,
    });
  },
}));
