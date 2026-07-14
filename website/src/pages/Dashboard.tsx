import { useState, useMemo, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../hooks/use-toast';
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";

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
  const [globalVisitsToday, setGlobalVisitsToday] = useState(0);
  const [selectedDateVisits, setSelectedDateVisits] = useState<any[]>([]);
  const [selectedDateAutoStops, setSelectedDateAutoStops] = useState<any[]>([]);
  const [selectedDateCrmActivities, setSelectedDateCrmActivities] = useState<any[]>([]);

  // Map State
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [, setRawPings] = useState<any[]>([]);
  const [selectedDateLocReqs, setSelectedDateLocReqs] = useState<any[]>([]);
  
  // Dynamic Map Zoom/Center State
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Add Associate State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssociate, setNewAssociate] = useState({ name: '', email: '', phone: '', password: '', regionId: '' });
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [expandedActivityIdx, setExpandedActivityIdx] = useState<number | null>(null);

  // Tracking Toggle State
  const [dailyTrackStatus, setDailyTrackStatus] = useState<'active' | 'ended' | null>(null);
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null);

  // Time boundaries
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);
  
  const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0).getTime();
  const selectedDateEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).getTime();

  // 1. Global Dashboard Stats
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'visits'),
      where('timestamp', '>=', todayStart),
      where('timestamp', '<=', todayEnd)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visibleUserIds = Object.keys(users).filter(id =>
        user.role === 'admin' || users[id].managerId === user.id
      );
      const relevantVisits = snapshot.docs.filter(doc => visibleUserIds.includes(doc.data().executiveId));
      setGlobalVisitsToday(relevantVisits.length);
    });
    return () => unsubscribe();
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
      setSelectedDateVisits([]);
      setSelectedDateCrmActivities([]);
      return;
    }

    setRoute([]);
    setRawPings([]);
    setSelectedDateLocReqs([]);
    setSelectedDateVisits([]);
    setSelectedDateCrmActivities([]);
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

    const vqToday = query(
      collection(db, 'visits'),
      where('executiveId', '==', selectedAssociate.id),
      where('timestamp', '>=', selectedDateStart),
      where('timestamp', '<=', selectedDateEnd),
      orderBy('timestamp', 'asc')
    );
    const unsubVToday = onSnapshot(vqToday, (snapshot) => {
      const visits = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setSelectedDateVisits(visits);
    });

    const unsubAutoStops = onSnapshot(
      collection(db, 'dailyTracks', trackDocId, 'visits'),
      (snapshot) => {
        const stops = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setSelectedDateAutoStops(stops);
      },
      (error) => console.error("Error fetching auto stops:", error)
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
    if (assocEmail) {
      const qCrm = query(collection(db, 'crmActivities'), where('executiveEmail', '==', assocEmail));
      var unsubCrm = onSnapshot(qCrm, (snapshot) => {
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

    return () => {
      unsubTrack();
      if (typeof unsubLocations === 'function') unsubLocations();
      unsubVToday();
      unsubAutoStops();
      unsubReqsToday();
      unsubLocationReq();
      if (typeof unsubCrm === 'function') unsubCrm();
    };
  }, [selectedAssociate, selectedDateStart, selectedDateEnd]);

  const timeline = useMemo(() => {
    const merged: any[] = [];
    const allVisitsAndStops = [...selectedDateVisits, ...selectedDateAutoStops];

    allVisitsAndStops.forEach(v => {
      const ts = v.timestamp?.toMillis ? v.timestamp.toMillis() : (v.timestamp || 0);
      const date = new Date(ts);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let eventText = `Checked in at ${v.schoolName || 'Unknown School'}`;
      if (v.type === 'location_ping') eventText = 'Location Updated';
      else if (v.type === 'break') eventText = 'Took a break';
      else if (v.type === 'unclassified') eventText = 'Unclassified Stop';
      else if (v.type === 'school') eventText = `Visited ${v.schoolName || 'Unknown School'}`;
      else if (v.type === 'teashop' || v.type === 'park') eventText = `Stopped at ${v.type}`;

      merged.push({
        time: timeStr,
        event: eventText,
        type: v.type === 'location_ping' ? 'ping' : 'visit',
        lat: v.checkInLat || v.location?.lat || v.lat,
        lng: v.checkInLng || v.location?.lng || v.lng,
        timestamp: ts,
        status: v.status || (v.type === 'location_ping' ? undefined : 'completed'),
        data: v,
      });
    });

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
        time: timeStr, event: eventText, type: 'crm', lat: a.lat, lng: a.lng,
        timestamp: ts, status: a.walkInStatus, data: a,
      });
    });

    merged.sort((a, b) => a.timestamp - b.timestamp);
    return merged;
  }, [selectedDateVisits, selectedDateLocReqs, selectedDateAutoStops, selectedDateCrmActivities]);

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
      date: format(selectedDate, 'yyyy-MM-dd')
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
      />

      <div className="flex-1 flex flex-col h-full gap-6 overflow-hidden">
        {!selectedAssociate ? (
          <GlobalStats 
            totalAssociates={totalAssociates} 
            globalVisitsToday={globalVisitsToday} 
            totalLeads={totalLeads} 
          />
        ) : (
          <AssociateHeader 
            selectedAssociate={selectedAssociate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyTrackStatus={dailyTrackStatus}
            toggleTrackingStatus={toggleTrackingStatus}
            timelineVisitsCount={timeline.filter(t => t.type === 'visit').length}
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
                Choose a team member from the sidebar to view their real-time location and visit analytics.
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
