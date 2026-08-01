import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import type { Task } from '@kalvium-outreach/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
}

function categorizeSingle(task: Task): 'overdue' | 'today' | 'upcoming' | 'completed' {
  if (task.status === 'completed') return 'completed';
  if (!task.date) return 'upcoming';
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const taskDate = new Date(task.date);
  if (taskDate < todayStart) return 'overdue';
  if (taskDate <= todayEnd) return 'today';
  return 'upcoming';
}

// ─── Hook: useTaskCenter ─────────────────────────────────────────────────────

export function useTaskCenter() {
  const { user, users } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get visible team members (same logic as Dashboard)
  const visibleUsers = useMemo(() => {
    const allUsers = Object.values(users);
    if (user?.role === 'admin') return allUsers;
    if (user?.role === 'regionalManager') {
      const myManagers = allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id);
      const myManagerIds = new Set(myManagers.map(m => m.id));
      const myExecutives = allUsers.filter(u => u.role === 'executive' && u.managerId && myManagerIds.has(u.managerId));
      return [...myManagers, ...myExecutives, user];
    }
    if (user?.role === 'teamLead') {
      return allUsers.filter(u => u.managerId === user.id || u.id === user.id);
    }
    return [];
  }, [user, users]);

  const executives = useMemo(() => {
    return visibleUsers.filter(u => u.role === 'executive');
  }, [visibleUsers]);

  // Real-time listener on appointments
  useEffect(() => {
    if (!user) return;
    const execIds = executives.map(u => u.id);
    if (execIds.length === 0) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    const chunks = chunkArray(execIds, 30);
    const unsubs: (() => void)[] = [];
    const allTasks = new Map<string, Task>();

    chunks.forEach(chunk => {
      const q = query(collection(db, 'appointments'), where('executiveId', 'in', chunk));
      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            allTasks.delete(change.doc.id);
          } else {
            allTasks.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Task);
          }
        });
        
        const allTasksArray = Array.from(allTasks.values());
        
        // Deduplicate obsolete pending tasks
        const latestPendingBySchool = new Map<string, number>();
        allTasksArray.forEach(t => {
          if (t.status !== 'completed' && t.date) {
            const key = `${t.executiveId}-${(t.schoolName || '').toLowerCase().trim()}`;
            const time = new Date(t.date).getTime();
            const current = latestPendingBySchool.get(key) || 0;
            if (time > current) {
              latestPendingBySchool.set(key, time);
            }
          }
        });

        const filteredTasks = allTasksArray.filter(t => {
          if (t.status === 'completed' || !t.date) return true;
          const key = `${t.executiveId}-${(t.schoolName || '').toLowerCase().trim()}`;
          const latestTime = latestPendingBySchool.get(key);
          const time = new Date(t.date).getTime();
          if (latestTime && time < latestTime) return false;
          return true;
        });

        setTasks(filteredTasks);
        setIsLoading(false);
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [user, executives]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const snoozeTask = async (taskId: string, snoozeUntilDate: Date) => {
    await updateDoc(doc(db, 'appointments', taskId), {
      snoozedUntil: snoozeUntilDate.toISOString(),
    });
  };

  const postponeTask = async (taskId: string, newDate: Date) => {
    await updateDoc(doc(db, 'appointments', taskId), {
      date: newDate.toISOString(),
      snoozedUntil: null,
    });
  };

  const pushToToday = async (taskId: string) => {
    await updateDoc(doc(db, 'appointments', taskId), {
      date: new Date().toISOString(),
      snoozedUntil: null,
    });
  };

  const completeTask = async (taskId: string) => {
    await updateDoc(doc(db, 'appointments', taskId), {
      status: 'completed',
      completedAt: serverTimestamp(),
    });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'appointments', taskId));
  };

  const assignTask = async (executiveId: string, schoolName: string, type: 'seminar' | 'follow-up', date: Date, notes?: string) => {
    await addDoc(collection(db, 'appointments'), {
      executiveId,
      schoolName: schoolName.trim(),
      type,
      date: date.toISOString(),
      status: 'pending',
      assignedBy: user?.name || 'Manager',
      notes: notes?.trim() || '',
      createdAt: serverTimestamp(),
    });
  };

  return {
    tasks,
    isLoading,
    executives,
    users,
    categorizeSingle,
    snoozeTask,
    postponeTask,
    pushToToday,
    completeTask,
    deleteTask,
    assignTask,
  };
}
