import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, addDoc, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { cleanGpsRoute, buildRouteCacheKey, type RawPing } from '../lib/gpsUtils';
import type { User, CrmActivity, Task } from '@kalvium-outreach/shared';

// Helper to chunk arrays for Firestore 'in' queries
function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
}

export function useDashboardData(
  user: User | null,
  visibleUsers: User[],
  selectedAssociate: User | null,
  selectedDate: Date,
  todayStart: number,
  todayEnd: number
) {
  // Map State
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [rawPings, setRawPings] = useState<RawPing[]>([]);

  const [routeCacheKey, setRouteCacheKey] = useState<string>('');
  const [isAssociateLoading, setIsAssociateLoading] = useState(false);
  
  interface LocationRequest {
    id: string;
    executiveId: string;
    status: string;
    requestedAt?: { toMillis?: () => number };
    [key: string]: unknown;
  }
  const [selectedDateLocReqs, setSelectedDateLocReqs] = useState<LocationRequest[]>([]);
  const [selectedDateCrmActivities, setSelectedDateCrmActivities] = useState<CrmActivity[]>([]);
  const [selectedAssociateTasks, setSelectedAssociateTasks] = useState<Task[]>([]);

  // Tracking Toggle State
  const [dailyTrackStatus, setDailyTrackStatus] = useState<'active' | 'ended' | 'stale' | null>(null);
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null);

  // Live Walk-Ins State
  const [ongoingWalkIns, setOngoingWalkIns] = useState<Record<string, CrmActivity>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isRefreshingOnReturn, setIsRefreshingOnReturn] = useState(false);

  // Team Tracking Status
  const [teamTrackingStatus, setTeamTrackingStatus] = useState<Record<string, 'active' | 'ended' | 'stale'>>({});

  // 1. Global Dashboard Stats & Live Walk-Ins (visibility-aware polling)
  useEffect(() => {
    if (!user) return;

    const visibleUserIds = visibleUsers.map(u => u.id);
    if (visibleUserIds.length === 0) return;

    const chunks = chunkArray(visibleUserIds, 30);

    const fetchDashboardStats = async (isReturn = false) => {
      if (isReturn) setIsRefreshingOnReturn(true);
      try {
        // Fetch ongoing walk-ins
        const currentWalkIns: Record<string, CrmActivity> = {};
        for (const chunk of chunks) {
          const qWalkIns = query(collection(db, 'ongoingWalkIns'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(qWalkIns);
          snapshot.forEach(doc => {
            currentWalkIns[doc.id] = doc.data() as CrmActivity;
          });
        }
        setOngoingWalkIns(currentWalkIns);

        // Fetch team tracking status for today
        const dateObj = new Date();
        const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
        
        const nextStatuses: Record<string, 'active' | 'ended' | 'stale'> = {};
        for (const chunk of chunks) {
          const qTracks = query(
            collection(db, 'dailyTracks'),
            where('date', '==', dateStr),
            where('userId', 'in', chunk)
          );
          const snapshot = await getDocs(qTracks);
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.userId && data.status) {
              nextStatuses[data.userId] = data.status;
            }
          });
        }
        setTeamTrackingStatus(nextStatuses);

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsStatsLoading(false);
        setIsRefreshingOnReturn(false);
      }
    };

    fetchDashboardStats();

    // Visibility-aware polling: only poll when the tab is active
    let interval: ReturnType<typeof setInterval> | null = setInterval(fetchDashboardStats, 300000);

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab went to background — stop polling
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        // Tab came back — fetch immediately, then resume polling
        fetchDashboardStats(true);
        interval = setInterval(fetchDashboardStats, 300000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };

  }, [user, visibleUsers]);

  // 2. Selected Associate Data (Analytics + Map)
  useEffect(() => {
    if (!selectedAssociate) {
      setRoute([]);
      setRawPings([]);
      setSelectedDateLocReqs([]);
      setSelectedDateCrmActivities([]);
      setIsAssociateLoading(false);
      return;
    }

    setIsAssociateLoading(true);

    setRoute([]);
    setRawPings([]);
    setSelectedDateLocReqs([]);
    setSelectedDateCrmActivities([]);
    setSelectedAssociateTasks([]);
    setRouteCacheKey('');

    setDailyTrackStatus(null);
    setDailyTrackId(null);

    const dateObj = new Date(selectedDate);
    const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
    const trackDocId = `${selectedAssociate.id}_${dateStr}`;
    setDailyTrackId(trackDocId);

    let locationsLoaded = false;
    let crmLoaded = false;
    const checkLoadingDone = () => {
      if (locationsLoaded && crmLoaded) {
        setIsAssociateLoading(false);
      }
    };

    const unsubTrack = onSnapshot(doc(db, 'dailyTracks', trackDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyTrackStatus(data.status || null);

        // Read route from routeArray on the document (no subcollection reads)
        const routeArray = (data.routeArray || []) as RawPing[];
        const sorted = routeArray.length > 0
          ? [...routeArray].sort((a, b) => a.ts - b.ts)
          : [];
        const validPings = sorted.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
        const cleanedPings = cleanGpsRoute(validPings);

        setRoute(cleanedPings.map(p => [p.lat, p.lng]));
        setRawPings(cleanedPings);

        if (selectedAssociate) {
          const dateStr = format(selectedDate, 'yyyyMMdd');
          setRouteCacheKey(buildRouteCacheKey(selectedAssociate.id, dateStr, cleanedPings));
        }
      } else {
        setDailyTrackStatus(null);
        setRoute([]);
        setRawPings([]);
      }

      if (!locationsLoaded) {
        locationsLoaded = true;
        checkLoadingDone();
      }
    });

    const qReqsToday = query(
      collection(db, 'locationRequests'),
      where('executiveId', '==', selectedAssociate.id)
    );
    const unsubReqsToday = onSnapshot(qReqsToday, (snapshot) => {
      const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LocationRequest));
      const filteredReqs = reqs.filter(r => {
        const ts = r.requestedAt?.toMillis ? r.requestedAt.toMillis() : (r.requestedAt as number || 0);
        return ts >= todayStart && ts <= todayEnd;
      });
      setSelectedDateLocReqs(filteredReqs);
    }, (error) => console.error("Error fetching locationRequests:", error));

    const qPending = query(
      collection(db, 'locationRequests'),
      where('executiveId', '==', selectedAssociate.id),
      where('status', '==', 'pending')
    );
    const unsubLocationReq = onSnapshot(qPending, (snapshot) => {
      setIsFetchingLocation(!snapshot.empty);
    });

    const assocEmail = selectedAssociate.email?.toLowerCase();
    let unsubCrm: (() => void) | undefined;
    if (assocEmail) {
      const qCrm = query(collection(db, 'crmActivities'), where('executiveEmail', '==', assocEmail));
      unsubCrm = onSnapshot(qCrm, (snapshot) => {
        if (!crmLoaded) {
          crmLoaded = true;
          checkLoadingDone();
        }
        const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CrmActivity));
        const filtered = activities.filter(a => {
          const dt = a.walkInDateTime || a.lsqCreatedOn;
          if (!dt) return false;
          const ts = new Date(dt).getTime();
          return ts >= todayStart && ts <= todayEnd;
        });
        setSelectedDateCrmActivities(filtered);
      });
    } else {
      crmLoaded = true;
      checkLoadingDone();
    }

    const qTasks = query(
      collection(db, 'appointments'),
      where('executiveId', '==', selectedAssociate.id)
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setSelectedAssociateTasks(tasks);
    });

    return () => {
      unsubTrack();
      unsubReqsToday();
      unsubLocationReq();
      if (typeof unsubCrm === 'function') unsubCrm();
      unsubTasks();
    };
  }, [selectedAssociate, todayStart, todayEnd, selectedDate]);

  const handleFetchLocation = async () => {
    if (!selectedAssociate) return;
    setIsFetchingLocation(true);
    try {
      await addDoc(collection(db, 'locationRequests'), {
        executiveId: selectedAssociate.id,
        requestedAt: serverTimestamp(),
        status: 'pending'
      });
    } catch (err) {
      console.error('Failed to request location:', err);
      setIsFetchingLocation(false);
    }
  };

  const toggleTrackingStatus = async () => {
    if (!dailyTrackId || !selectedAssociate) return;
    const newStatus = dailyTrackStatus === 'active' ? 'ended' : 'active';
    setDailyTrackStatus(newStatus);
    await setDoc(doc(db, 'dailyTracks', dailyTrackId), {
      status: newStatus,
      executiveId: selectedAssociate.id,
      date: format(selectedDate, 'yyyyMMdd')
    }, { merge: true });
  };

  const cancelOngoingWalkIn = async () => {
    if (!selectedAssociate) return;
    try {
      // deleteDoc must be imported from 'firebase/firestore'
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'ongoingWalkIns', selectedAssociate.id));
      
      // Update local state immediately so UI reflects the cancellation
      setOngoingWalkIns(prev => {
        const next = { ...prev };
        delete next[selectedAssociate.id];
        return next;
      });
    } catch (err) {
      console.error('Failed to cancel ongoing walk-in:', err);
    }
  };

  return {
    ongoingWalkIns,
    teamTrackingStatus,
    isStatsLoading,
    isRefreshingOnReturn,
    dailyTrackStatus,
    dailyTrackId,
    route,
    rawPings,
    routeCacheKey,
    selectedDateLocReqs,
    selectedDateCrmActivities,
    selectedAssociateTasks,
    isFetchingLocation,
    isAssociateLoading,
    handleFetchLocation,
    toggleTrackingStatus,
    cancelOngoingWalkIn,
  };
}
