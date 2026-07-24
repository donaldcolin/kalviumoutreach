import { useState, useMemo, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../hooks/use-toast';
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";
import { buildTimeline } from '../lib/timelineBuilder';

import { TeamSidebar } from '../components/dashboard/TeamSidebar';
import { GlobalStats } from '../components/dashboard/GlobalStats';
import { AssociateHeader } from '../components/dashboard/AssociateHeader';
import { AssociateMap } from '../components/dashboard/AssociateMap';
import { AssociateTimeline } from '../components/dashboard/AssociateTimeline';
import { Map as MapIcon, } from 'lucide-react';
import { format } from "date-fns";
import { cleanGpsRoute, buildRouteCacheKey, type RawPing } from '../lib/gpsUtils';

export default function Dashboard() {
  const { user, users, addAssociate } = useAuthStore();
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
  const [routeCacheKey, setRouteCacheKey] = useState<string>('');
  const [selectedDateLocReqs, setSelectedDateLocReqs] = useState<any[]>([]);

  // Dynamic Map Zoom/Center State
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Add Associate State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssociate, setNewAssociate] = useState({ name: '', email: '', phone: '', password: '', regionId: '' });
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [expandedActivityIdx, setExpandedActivityIdx] = useState<number | null>(null);
  const [, setSelectedAssociateTasks] = useState<any[]>([]);

  // Tracking Toggle State
  const [dailyTrackStatus, setDailyTrackStatus] = useState<'active' | 'ended' | null>(null);
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null);

  // Live Walk-Ins State
  const [ongoingWalkIns, setOngoingWalkIns] = useState<Record<string, any>>({});

  // Team Tracking Status
  const [teamTrackingStatus, setTeamTrackingStatus] = useState<Record<string, 'active' | 'ended'>>({});

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

  // 1. Global Dashboard Stats & Live Walk-Ins
  useEffect(() => {
    if (!user) return;



    // Global ongoing walk-ins
    const qWalkIns = collection(db, 'ongoingWalkIns');
    const unsubscribeWalkIns = onSnapshot(qWalkIns, (snapshot) => {
      const currentWalkIns: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        currentWalkIns[doc.id] = doc.data();
      });
      setOngoingWalkIns(currentWalkIns);
    });

    // Global team tracking status for today
    const dateObj = new Date();
    const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;

    const qTracks = query(
      collection(db, 'dailyTracks'),
      where('date', '==', dateStr)
    );
    const unsubscribeTracks = onSnapshot(qTracks, (snapshot) => {
      const statuses: Record<string, 'active' | 'ended'> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && data.status) {
          statuses[data.userId] = data.status;
        }
      });
      setTeamTrackingStatus(statuses);
    });

    return () => {
      unsubscribeWalkIns();
      unsubscribeTracks();
    };
  }, [user, users, todayStart, todayEnd]);

  // Global Toast Notifications for new checks
  useEffect(() => {
    let initialLoad = true;
    const q = query(collection(db, 'visits'), where('timestamp', '>=', todayStart));

    const unsub = onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
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

    return () => unsub();
  }, [users, toast, todayStart]);

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
        const pings = snapshot.docs.map(d => d.data() as RawPing);
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
  }, [selectedAssociate, selectedDateStart, selectedDateEnd]);

  const timeline = useMemo(() => {
    return buildTimeline(selectedDateLocReqs, selectedDateCrmActivities, rawPings);
  }, [selectedDateLocReqs, selectedDateCrmActivities, rawPings]);

  const visibleUsers = useMemo(() => {
    const allUsers = Object.values(users);
    if (user?.role === 'admin') return allUsers.filter(u => u.role !== 'admin');
    if (user?.role === 'teamLead') return allUsers.filter(u => u.managerId === user.id);
    return [];
  }, [user, users]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return visibleUsers;
    const lowerQ = searchQuery.toLowerCase();
    return visibleUsers.filter(u =>
      u.name.toLowerCase().includes(lowerQ) ||
      (u.regionId && u.regionId.toLowerCase().includes(lowerQ))
    );
  }, [visibleUsers, searchQuery]);

  const totalAssociates = visibleUsers.filter(u => u.role === 'executive').length;
  const totalLeads = visibleUsers.filter(u => u.role === 'teamLead').length;

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

  const handleAddAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `exec_${Date.now()}`;
    try {
      await addAssociate({
        id,
        name: newAssociate.name,
        email: newAssociate.email,
        phone: newAssociate.phone,
        role: 'executive',
        regionId: newAssociate.regionId || user?.regionId || 'south-1',
        managerId: user?.id,
        active: true,
      }, newAssociate.password);
      setShowAddModal(false);
      setNewAssociate({ name: '', email: '', phone: '', password: '', regionId: '' });
    } catch (err) {
      alert('Failed to create associate. Check console for details.');
    }
  };

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
    } catch (err) {
      toast({ title: 'Sync Failed', description: 'Make sure the Firebase Emulator or Cloud Function is running.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-48px)] gap-6 bg-transparent text-gray-900 animate-in fade-in duration-700">
      <TeamSidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredUsers={filteredUsers}
        selectedAssociate={selectedAssociate}
        setSelectedAssociate={setSelectedAssociate}
        handleSyncLSQ={handleSyncLSQ}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newAssociate={newAssociate}
        setNewAssociate={setNewAssociate}
        handleAddAssociate={handleAddAssociate}
        ongoingWalkIns={ongoingWalkIns}
        teamTrackingStatus={teamTrackingStatus}
      />

      <div className="flex-1 flex flex-col h-full gap-6 overflow-hidden">
        {!selectedAssociate ? (
          <GlobalStats
            totalAssociates={totalAssociates}
            activeWalkIns={Object.keys(ongoingWalkIns).length}
            totalLeads={totalLeads}
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
        <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="text-center flex flex-col items-center max-w-sm">
              <div className="w-20 h-20 bg-gray-50 border border-gray-100 flex items-center justify-center mb-6 shadow-sm rounded-xl">
                <MapIcon className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Select an associate</h3>
              <p className="text-gray-500 text-sm mt-3 font-medium leading-relaxed">
                Choose a team member from the sidebar to view their real-time location and activity timeline.
              </p>
            </div>
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
