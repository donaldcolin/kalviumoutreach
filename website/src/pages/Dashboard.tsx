import { useState, useMemo, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../hooks/use-toast';
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";
import { calculateDistanceMeters } from '../lib/distance';

import { TeamSidebar } from '../components/dashboard/TeamSidebar';
import { GlobalStats } from '../components/dashboard/GlobalStats';
import { AssociateHeader } from '../components/dashboard/AssociateHeader';
import { AssociateMap } from '../components/dashboard/AssociateMap';
import { AssociateTimeline } from '../components/dashboard/AssociateTimeline';
import { Map as MapIcon } from 'lucide-react';
import { format } from "date-fns";

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

  // Time boundaries
  const todayStart = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const todayEnd = useMemo(() => new Date().setHours(23, 59, 59, 999), []);

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
        const pings = snapshot.docs.map(d => d.data());
        const validPings = pings.filter((p: any) => p && typeof p.lat === 'number' && typeof p.lng === 'number');
        setRoute(validPings.map((p: any) => [p.lat, p.lng]));
        setRawPings(validPings);
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
    const merged: any[] = [];

    selectedDateLocReqs.forEach(r => {
      const ts = r.requestedAt?.toMillis ? r.requestedAt.toMillis() : (r.requestedAt || Date.now());
      const date = new Date(ts);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      merged.push({ time: timeStr, event: `Location Request (${r.status})`, type: 'request', status: r.status, timestamp: ts, data: r });
    });

    selectedDateCrmActivities.forEach(a => {
      const dt = a.walkInDateTime || a.lsqCreatedOn;
      const ts = dt ? new Date(dt).getTime() : Date.now();
      const date = new Date(ts);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const stageLabel = a.walkInStatus || 'Visit';
      let eventText = `📋 ${a.schoolName || 'School'} — ${stageLabel}`;
      if (a.typeOfWalkIn) eventText = `📋 ${a.typeOfWalkIn}: ${a.schoolName || 'School'} (${stageLabel})`;

      merged.push({
        time: timeStr, event: eventText, type: 'crm',
        lat: a.lat ?? a.startLocation?.lat ?? null,
        lng: a.lng ?? a.startLocation?.lng ?? null,
        timestamp: ts, status: a.walkInStatus, data: a,
      });
    });

    // 3. GPS Signal Lost Gaps
    for (let i = 1; i < rawPings.length; i++) {
      const prev = rawPings[i - 1];
      const curr = rawPings[i];
      const prevTs = prev.ts?.toMillis ? prev.ts.toMillis() : (prev.ts || 0);
      const currTs = curr.ts?.toMillis ? curr.ts.toMillis() : (curr.ts || 0);

      const gapMs = currTs - prevTs;
      if (gapMs > 3600000) { // > 1 hour gap
        const date = new Date(currTs);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const gapMins = Math.round(gapMs / 60000);
        merged.push({
          time: timeStr,
          event: 'GPS Signal Lost',
          details: `No background location data received for ${gapMins > 120 ? Math.round(gapMins / 60) + ' hours' : gapMins + ' minutes'}`,
          type: 'warning',
          timestamp: currTs - 1000,
          isWarning: true
        });
      }
    }

    merged.sort((a, b) => a.timestamp - b.timestamp);

    // Anti-Cheat: Impossible Travel & Short Duration
    const finalTimeline: any[] = [];
    let lastLoc: { lat: number, lng: number, timestamp: number } | null = null;

    merged.forEach(item => {
      // 1. Short Duration Warning for CRM activities
      if (item.type === 'crm' && item.data) {
        const a = item.data;
        const walkInTs = a.walkInDateTime ? new Date(a.walkInDateTime).getTime() : 0;
        const createdTs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        if (walkInTs > 0 && createdTs > 0) {
          const durationMs = createdTs - walkInTs;
          if (durationMs > 0 && durationMs < 180000 && (a.walkInStatus?.includes('PI') || a.walkInStatus?.includes('Principal') || a.walkInStatus?.includes('Seminar'))) {
            finalTimeline.push({
              time: item.time,
              event: 'Suspiciously Short Duration',
              details: `Principal Interaction lasted only ${Math.round(durationMs / 1000)}s`,
              type: 'warning',
              timestamp: item.timestamp - 1,
              isWarning: true
            });
          }
        }
      }

      // 2. Impossible Travel
      if (item.lat && item.lng && item.timestamp) {
        if (lastLoc) {
          const distMeters = calculateDistanceMeters(lastLoc.lat, lastLoc.lng, item.lat, item.lng);
          const timeHours = (item.timestamp - lastLoc.timestamp) / 3600000;
          if (timeHours > 0) {
            const speedKmh = (distMeters / 1000) / timeHours;
            if (speedKmh > 100) {
              finalTimeline.push({
                time: item.time,
                event: 'Impossible Travel Detected',
                details: `Speed ~${Math.round(speedKmh)} km/h between check-ins (${(distMeters / 1000).toFixed(1)}km in ${Math.round(timeHours * 60)}m)`,
                type: 'warning',
                timestamp: item.timestamp - 1,
                isWarning: true
              });
            }
          }
        }
        lastLoc = { lat: item.lat, lng: item.lng, timestamp: item.timestamp };
      }

      finalTimeline.push(item);
    });

    return finalTimeline;
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

  useEffect(() => {
    if (route.length > 0) {
      setMapCenter(route[0]);
      setMapZoom(14);
    }
  }, [route.length > 0 ? route[0] : null]);

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
    <div className="flex h-[calc(100vh-48px)] gap-6 p-6 bg-[#fafafa] text-zinc-900 animate-in fade-in duration-700">
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
          />
        )}

        {!selectedAssociate ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl">
            <div className="text-center flex flex-col items-center max-w-sm">
              <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-inner rounded-xl">
                <MapIcon className="h-8 w-8 text-zinc-300" />
              </div>
              <h3 className="text-xl font-medium text-zinc-900 tracking-tight">Select an associate</h3>
              <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
                Choose a team member from the sidebar to view their real-time location and activity timeline.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-700">
            <AssociateMap
              isFetchingLocation={isFetchingLocation}
              handleFetchLocation={handleFetchLocation}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              route={route}
              timeline={timeline}
              ongoingWalkIn={selectedAssociate ? ongoingWalkIns[selectedAssociate.id] : null}
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
