import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../hooks/use-toast';
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";
import { EmptyState } from '../components/ui/EmptyState';
import { buildTimeline } from '../lib/timelineBuilder';

import { TeamSidebar } from '../components/dashboard/TeamSidebar';
import { GlobalStats } from '../components/dashboard/GlobalStats';
import { AssociateHeader } from '../components/dashboard/AssociateHeader';
import { AssociateMap } from '../components/dashboard/AssociateMap';
import { AssociateTimeline } from '../components/dashboard/AssociateTimeline';
import { Map as MapIcon, } from 'lucide-react';
import { format } from "date-fns";
import { cleanGpsRoute, buildRouteCacheKey, type RawPing } from '../lib/gpsUtils';
import { documentId } from 'firebase/firestore';

function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
}

export default function Dashboard() {
  const { user, users } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssociate, setSelectedAssociate] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Analytics State
  const [selectedDateCrmActivities, setSelectedDateCrmActivities] = useState<any[]>([]);

  // Map State
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [rawPings, setRawPings] = useState<any[]>([]);
  const rawPingsRef = useRef<Map<string, RawPing>>(new Map());
  const [routeCacheKey, setRouteCacheKey] = useState<string>('');
  const [selectedDateLocReqs, setSelectedDateLocReqs] = useState<any[]>([]);

  // Dynamic Map Zoom/Center State
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Add Associate State
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [expandedActivityIdx, setExpandedActivityIdx] = useState<number | null>(null);
  const [, setSelectedAssociateTasks] = useState<any[]>([]);

  // Tracking Toggle State
  const [dailyTrackStatus, setDailyTrackStatus] = useState<'active' | 'ended' | 'stale' | null>(null);
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null);

  // Live Walk-Ins State
  const [ongoingWalkIns, setOngoingWalkIns] = useState<Record<string, any>>({});

  // Team Tracking Status
  const [teamTrackingStatus, setTeamTrackingStatus] = useState<Record<string, 'active' | 'ended' | 'stale'>>({});

  // Time boundaries — recompute periodically so the dashboard stays
  // correct if the tab is left open past midnight (fixes BUG-08).
  const [todayStart, setTodayStart] = useState(() => new Date().setHours(0, 0, 0, 0));
  const [todayEnd, setTodayEnd] = useState(() => new Date().setHours(23, 59, 59, 999));

  useEffect(() => {
    const interval = setInterval(() => {
      const newStart = new Date().setHours(0, 0, 0, 0);
      if (newStart !== todayStart) {
        setTodayStart(newStart);
        setTodayEnd(new Date().setHours(23, 59, 59, 999));
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [todayStart]);

  const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0).getTime();
  const selectedDateEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).getTime();

  const visibleUsers = useMemo(() => {
    const allUsers = Object.values(users);
    
    if (user?.role === 'admin') {
      return allUsers; 
    }
    
    if (user?.role === 'regionalManager') {
      const myManagers = allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id);
      const myManagerIds = new Set(myManagers.map(m => m.id));
      const myExecutives = allUsers.filter(u => u.role === 'executive' && u.managerId && myManagerIds.has(u.managerId));
      return [...myManagers, ...myExecutives, user]; // Include the AGM themselves
    }
    
    if (user?.role === 'teamLead') {
      return allUsers.filter(u => u.managerId === user.id || u.id === user.id); // Include the Manager themselves
    }
    
    return [];
  }, [user, users]);

  // 1. Global Dashboard Stats & Live Walk-Ins
  useEffect(() => {
    if (!user) return;

    const visibleUserIds = visibleUsers.map(u => u.id);
    if (visibleUserIds.length === 0) return;

    const chunks = chunkArray(visibleUserIds, 30);
    const unsubsWalkIns: (() => void)[] = [];
    const unsubsTracks: (() => void)[] = [];

    // Global ongoing walk-ins
    const currentWalkIns: Record<string, any> = {};
    chunks.forEach(chunk => {
      const qWalkIns = query(collection(db, 'ongoingWalkIns'), where(documentId(), 'in', chunk));
      const unsub = onSnapshot(qWalkIns, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            delete currentWalkIns[change.doc.id];
          } else {
            currentWalkIns[change.doc.id] = change.doc.data();
          }
        });
        setOngoingWalkIns({ ...currentWalkIns });
      });
      unsubsWalkIns.push(unsub);
    });

    // Global team tracking status for today
    const dateObj = new Date();
    const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;

    chunks.forEach(chunk => {
      const qTracks = query(
        collection(db, 'dailyTracks'),
        where('date', '==', dateStr),
        where('userId', 'in', chunk)
      );
      const unsub = onSnapshot(qTracks, (snapshot) => {
        setTeamTrackingStatus(prevStatuses => {
          const nextStatuses = { ...prevStatuses };
          snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            if (data.userId && data.status) {
              nextStatuses[data.userId] = data.status;
              if (change.type === 'modified' && data.status === 'stale' && prevStatuses[data.userId] !== 'stale') {
                const assocUser = users[data.userId];
                const name = assocUser ? assocUser.name : 'An associate';
                toast({
                  title: '⚠️ App Force-Closed',
                  description: `${name}'s tracking session became stale. Their app may have been force-closed or lost connection.`,
                  variant: 'destructive',
                });
              }
            }
          });
          return nextStatuses;
        });
      });
      unsubsTracks.push(unsub);
    });

    return () => {
      unsubsWalkIns.forEach(u => u());
      unsubsTracks.forEach(u => u());
    };
  }, [user, visibleUsers, users]);

  // Global Toast Notifications for new checks
  useEffect(() => {
    const visibleUserIds = visibleUsers.map(u => u.id);
    if (visibleUserIds.length === 0) return;

    const chunks = chunkArray(visibleUserIds, 30);
    const unsubs: (() => void)[] = [];
    const initialLoadMap = new Map<string, boolean>();
    
    chunks.forEach(chunk => {
      const chunkId = chunk.join(',');
      initialLoadMap.set(chunkId, true);
      
      const q = query(collection(db, 'visits'), where('timestamp', '>=', todayStart), where('executiveId', 'in', chunk));
      
      const unsub = onSnapshot(q, (snapshot) => {
        if (initialLoadMap.get(chunkId)) {
          initialLoadMap.set(chunkId, false);
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const assoc = users[data.executiveId];
            const name = assoc ? assoc.name : 'An associate';

            let action = `checked in at ${data.schoolName || 'Unknown School'}`;
            if (data.type === 'break') action = 'took a break';
            else if (data.type === 'unclassified') action = 'recorded an unclassified stop';

            toast({
              title: "Live Update",
              description: `${name} just ${action}.`,
            });
          }
        });
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [visibleUsers, users, toast, todayStart]);

  // 2. Selected Associate Data (Analytics + Map)
  useEffect(() => {
    if (!selectedAssociate) {
      setRoute([]);
      setRawPings([]);
      setSelectedDateLocReqs([]);
      setSelectedDateCrmActivities([]);
      return;
    }

    setRoute([]);
    setRawPings([]);
    setSelectedDateLocReqs([]);
    setSelectedDateCrmActivities([]);
    setSelectedAssociateTasks([]);
    setRouteCacheKey('');
    rawPingsRef.current.clear();
    setDailyTrackStatus(null);
    setDailyTrackId(null);

    const dateObj = new Date(selectedDate);
    const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
    const trackDocId = `${selectedAssociate.id}_${dateStr}`;
    setDailyTrackId(trackDocId);

    const unsubTrack = onSnapshot(doc(db, 'dailyTracks', trackDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyTrackStatus(data.status || null);
      } else {
        setDailyTrackStatus(null);
      }
    });

    const unsubLocations = onSnapshot(
      query(collection(db, 'dailyTracks', trackDocId, 'locations'), orderBy('ts', 'asc')),
      (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            rawPingsRef.current.delete(change.doc.id);
            changed = true;
          } else {
            rawPingsRef.current.set(change.doc.id, change.doc.data() as RawPing);
            changed = true;
          }
        });
        
        if (!changed && !snapshot.empty) return;

        const pings = Array.from(rawPingsRef.current.values()).sort((a, b) => a.ts - b.ts);
        const validPings = pings.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number');
        
        // Apply client-side GPS cleaning pipeline
        const cleanedPings = cleanGpsRoute(validPings);
        
        setRoute(cleanedPings.map((p) => [p.lat, p.lng]));
        setRawPings(cleanedPings);
        
        // Build cache key — changes when new pings arrive, busting the OSRM cache
        if (selectedAssociate) {
          const dateStr = format(selectedDate, 'yyyyMMdd');
          setRouteCacheKey(buildRouteCacheKey(selectedAssociate.id, dateStr, cleanedPings));
        }
      }
    );



    const qReqsToday = query(
      collection(db, 'locationRequests'),
      where('executiveId', '==', selectedAssociate.id)
    );
    const unsubReqsToday = onSnapshot(qReqsToday, (snapshot) => {
      const reqs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const filteredReqs = reqs.filter(r => {
        const ts = r.requestedAt?.toMillis ? r.requestedAt.toMillis() : (r.requestedAt || 0);
        return ts >= selectedDateStart && ts <= selectedDateEnd;
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
        const activities = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const filtered = activities.filter(a => {
          const dt = a.walkInDateTime || a.lsqCreatedOn;
          if (!dt) return false;
          const ts = new Date(dt).getTime();
          return ts >= selectedDateStart && ts <= selectedDateEnd;
        });
        setSelectedDateCrmActivities(filtered);
      });
    }

    const qTasks = query(
      collection(db, 'appointments'),
      where('executiveId', '==', selectedAssociate.id)
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setSelectedAssociateTasks(tasks);
    });

    return () => {
      unsubTrack();
      if (typeof unsubLocations === 'function') unsubLocations();
      unsubReqsToday();
      unsubLocationReq();
      if (typeof unsubCrm === 'function') unsubCrm();
      unsubTasks();
    };
  }, [selectedAssociate, selectedDateStart, selectedDateEnd, selectedDate]);

  const timeline = useMemo(() => {
    return buildTimeline(selectedDateLocReqs, selectedDateCrmActivities, rawPings);
  }, [selectedDateLocReqs, selectedDateCrmActivities, rawPings]);



  const filteredUsers = useMemo(() => {
    let result = visibleUsers;
    
    // Filter by selected manager (for AGMs and Admins)
    if (selectedManagerId !== 'all') {
      result = result.filter(u => u.managerId === selectedManagerId || u.id === selectedManagerId);
    }
    
    if (!searchQuery) return result;
    const lowerQ = searchQuery.toLowerCase();
    return result.filter(u =>
      u.name.toLowerCase().includes(lowerQ) ||
      (u.regionId && u.regionId.toLowerCase().includes(lowerQ))
    );
  }, [visibleUsers, searchQuery, selectedManagerId]);

  const totalAssociates = visibleUsers.filter(u => u.role === 'executive').length;

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

  const routeStartLat = route.length > 0 ? route[0][0] : null;
  const routeStartLng = route.length > 0 ? route[0][1] : null;

  useEffect(() => {
    if (routeStartLat !== null && routeStartLng !== null) {
      setMapCenter([routeStartLat, routeStartLng]);
      setMapZoom(14);
    }
  }, [routeStartLat, routeStartLng]);

  useEffect(() => {
    if (selectedActivity && selectedActivity.lat !== undefined && selectedActivity.lng !== undefined) {
      setMapCenter([selectedActivity.lat, selectedActivity.lng]);
      setMapZoom(17);
    }
  }, [selectedActivity]);



  const handleSyncLSQ = async () => {
    try {
      toast({ title: 'Syncing LeadSquared...', description: 'Fetching latest activities globally.' });

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';
      const res = await fetch(`${API_BASE_URL}/api/sync-now`);
      const data = await res.json();

      toast({
        title: 'Sync Complete',
        description: data.message || `Sync started in the background.`
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Sync Failed', description: 'Make sure the Firebase Emulator or Cloud Function is running.', variant: 'destructive' });
    }
  };

  const availableManagers = useMemo(() => {
    return visibleUsers.filter(u => u.role === 'teamLead');
  }, [visibleUsers]);

  return (
    <div className="flex h-[calc(100vh-48px)] gap-6 bg-transparent text-gray-900 animate-in fade-in duration-700">
      <TeamSidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredUsers={filteredUsers}
        selectedAssociate={selectedAssociate}
        setSelectedAssociate={setSelectedAssociate}
        handleSyncLSQ={handleSyncLSQ}
        ongoingWalkIns={ongoingWalkIns}
        teamTrackingStatus={teamTrackingStatus}
        managers={availableManagers}
        selectedManagerId={selectedManagerId}
        setSelectedManagerId={setSelectedManagerId}
      />

      <div className="flex-1 flex flex-col h-full gap-6 overflow-hidden">
        {!selectedAssociate ? (
          <GlobalStats
            totalAssociates={totalAssociates}
            activeWalkIns={Object.keys(ongoingWalkIns).length}
          />
        ) : (
          <AssociateHeader 
            selectedAssociate={selectedAssociate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyTrackStatus={dailyTrackStatus}
            toggleTrackingStatus={toggleTrackingStatus}
            timelineVisitsCount={timeline.filter(t => t.type === 'crm').length}
            ongoingWalkIn={selectedAssociate ? ongoingWalkIns[selectedAssociate.id] : null}
            isFetchingLocation={isFetchingLocation}
            handleFetchLocation={handleFetchLocation}
          />
        )}

        {!selectedAssociate ? (
          <div className="flex-1">
            <EmptyState 
              icon={MapIcon}
              title="Select an associate"
              description="Choose a team member from the sidebar to view their real-time location and activity timeline."
            />
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-700">
            <AssociateMap
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              route={route}
              timeline={timeline}
              ongoingWalkIn={selectedAssociate ? ongoingWalkIns[selectedAssociate.id] : null}
              routeCacheKey={routeCacheKey}
            />
            <AssociateTimeline
              timeline={timeline}
              selectedDate={selectedDate}
              expandedActivityIdx={expandedActivityIdx}
              setExpandedActivityIdx={setExpandedActivityIdx}
              setSelectedActivity={setSelectedActivity}
              setMapCenter={setMapCenter}
              setMapZoom={setMapZoom}
            />
          </div>
        )}
      </div>

      <TimelineActivityDialog
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
        stop={selectedActivity}
      />
    </div>
  );
}
