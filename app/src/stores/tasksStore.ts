import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

export interface Task {
  id: string;
  executiveId: string;
  status: 'pending' | 'completed';
  date?: string;
  completedAt?: any;
  [key: string]: any;
}

interface TasksState {
  pendingTasks: Task[];
  completedTasks: Task[];
  isLoading: boolean;
  isRefreshing: boolean;
  _currentUserId: string | null;

  initialize: (userId: string) => void;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
}

async function fetchTasks(userId: string): Promise<{ pending: Task[]; completed: Task[] }> {
  const snapshot = await firestore()
    .collection('appointments')
    .where('executiveId', '==', userId)
    .get();

  const pending: Task[] = [];
  const completed: Task[] = [];

  snapshot.docs.forEach((d) => {
    const task = { id: d.id, ...d.data() } as Task;
    if (task.status === 'pending') {
      pending.push(task);
    } else if (task.status === 'completed') {
      completed.push(task);
    }
  });

  // Sort pending: closest first
  pending.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // Sort completed: most recent first
  completed.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return { pending, completed };
}

export const useTasksStore = create<TasksState>((set, get) => ({
  pendingTasks: [],
  completedTasks: [],
  isLoading: true,
  isRefreshing: false,
  _currentUserId: null,

  initialize: async (userId: string) => {
    const state = get();
    // Don't re-fetch if already loaded for this user
    if (state._currentUserId === userId && (state.pendingTasks.length > 0 || state.completedTasks.length > 0 || !state.isLoading)) {
      return;
    }

    set({ isLoading: true, _currentUserId: userId });

    try {
      const { pending, completed } = await fetchTasks(userId);
      set({ pendingTasks: pending, completedTasks: completed, isLoading: false });
    } catch (err) {
      console.error('Tasks fetch error:', err);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const { _currentUserId } = get();
    if (!_currentUserId) return;

    set({ isRefreshing: true });
    try {
      const { pending, completed } = await fetchTasks(_currentUserId);
      set({ pendingTasks: pending, completedTasks: completed, isRefreshing: false });
    } catch (err) {
      console.error('Tasks refresh error:', err);
      set({ isRefreshing: false });
    }
  },

  completeTask: async (taskId: string) => {
    try {
      await firestore().collection('appointments').doc(taskId).update({
        status: 'completed',
        completedAt: firestore.FieldValue.serverTimestamp()
      });
      // Refresh the list after completing
      await get().refresh();
    } catch (err) {
      console.error('Failed to complete task', err);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  },
}));
