import { useState, useMemo, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { Users, TrendingUp, Search, UserPlus, MapPin, Map as MapIcon, Clock, Briefcase, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format } from "date-fns";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Dashboard() {
  const { user, users, addAssociate } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssociate, setSelectedAssociate] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Analytics State
  const [globalVisitsToday, setGlobalVisitsToday] = useState(0);
  const [selectedDateVisits, setSelectedDateVisits] = useState<any[]>([]);

  // Map State
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [rawPings, setRawPings] = useState<any[]>([]);
  const [selectedDateLocReqs, setSelectedDateLocReqs] = useState<any[]>([]);

  // Add Associate State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssociate, setNewAssociate] = useState({ name: '', email: '', phone: '', password: '' });
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Tracking Toggle State
  const [dailyTrackStatus, setDailyTrackStatus] = useState<'active' | 'ended' | null>(null);
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null);

  // Time boundaries
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);
  
  const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0).getTime();
  const selectedDateEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).getTime();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

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

  // 2. Selected Associate Data (Analytics + Map)
  useEffect(() => {
    if (!selectedAssociate) {
      setRoute([]);
      setRawPings([]);
      setSelectedDateLocReqs([]);
      setSelectedDateVisits([]);
      return;
    }

    // Clear state before fetching for the new date/associate to prevent stale data
    setRoute([]);
    setRawPings([]);
    setSelectedDateLocReqs([]);
    setSelectedDateVisits([]);
    setDailyTrackStatus(null);
    setDailyTrackId(null);

    // Map: Daily Track
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

    // Map: Timeline (Selected Date visits)
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

    // Map: Timeline (Selected Date Location Requests)
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
    }, (error) => {
      console.error("Error fetching locationRequests:", error);
    });

    // Location Request Status
    const qPending = query(
      collection(db, 'locationRequests'),
      where('executiveId', '==', selectedAssociate.id),
      where('status', '==', 'pending')
    );
    const unsubLocationReq = onSnapshot(qPending, (snapshot) => {
      setIsFetchingLocation(!snapshot.empty);
    });

    return () => {
      unsubTrack();
      if (typeof unsubLocations === 'function') unsubLocations();
      unsubVToday();
      unsubReqsToday();
      unsubLocationReq();
    };
  }, [selectedAssociate, selectedDateStart, selectedDateEnd]);

  // Compute Timeline
  const timeline = useMemo(() => {
    const merged: any[] = [];
    
    selectedDateVisits.forEach(v => {
      const date = new Date(v.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      merged.push({
        time: timeStr,
        event: v.type === 'location_ping' ? 'Location Updated' : `Checked in at ${v.schoolName || 'Unknown School'}`,
        type: v.type === 'location_ping' ? 'ping' : 'visit',
        lat: v.checkInLat,
        lng: v.checkInLng,
        timestamp: v.timestamp,
        data: v
      });
    });

    selectedDateLocReqs.forEach(r => {
      // requestedAt could be a Firestore Timestamp
      const ts = r.requestedAt?.toMillis ? r.requestedAt.toMillis() : (r.requestedAt || Date.now());
      const date = new Date(ts);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      merged.push({
        time: timeStr,
        event: `Location Request (${r.status})`,
        type: 'request',
        status: r.status,
        timestamp: ts,
        data: r
      });
    });

    merged.sort((a, b) => a.timestamp - b.timestamp);
    return merged;
  }, [selectedDateVisits, selectedDateLocReqs]);

  // Compute what to display based on hierarchy
  const visibleUsers = useMemo(() => {
    const allUsers = Object.values(users);
    if (user?.role === 'admin') {
      return allUsers.filter(u => u.role !== 'admin');
    }
    if (user?.role === 'teamLead') {
      return allUsers.filter(u => u.managerId === user.id);
    }
    return [];
  }, [user, users]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return visibleUsers;
    const lowerQ = searchQuery.toLowerCase();
    return visibleUsers.filter(u =>
      u.name.toLowerCase().includes(lowerQ) ||
      u.employeeId.toLowerCase().includes(lowerQ)
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
    if (!dailyTrackId || !dailyTrackStatus) return;
    const newStatus = dailyTrackStatus === 'active' ? 'ended' : 'active';
    // Optimistic update
    setDailyTrackStatus(newStatus);
    await setDoc(doc(db, 'dailyTracks', dailyTrackId), { status: newStatus }, { merge: true });
  };

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
        employeeId: `EMP-EXEC-${Math.floor(Math.random() * 1000)}`,
        regionId: user?.regionId || 'south-1',
        managerId: user?.id,
        active: true,
      }, newAssociate.password);
      setShowAddModal(false);
      setNewAssociate({ name: '', email: '', phone: '', password: '' });
    } catch (err) {
      alert('Failed to create associate. Check console for details.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-48px)] gap-6 p-6 bg-[#fafafa] text-zinc-900 animate-in fade-in duration-700">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[340px] flex flex-col h-full bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight">Team</h2>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger render={<button className="h-8 w-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-colors rounded-xl" />}>
                <UserPlus size={16} />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] border-zinc-200 p-0 overflow-hidden rounded-xl shadow-2xl">
                <div className="p-6 bg-zinc-900 text-white">
                  <DialogTitle className="text-xl font-medium">New Associate</DialogTitle>
                  <DialogDescription className="text-zinc-400 mt-2">Enter the details below to provision a new account.</DialogDescription>
                </div>
                <form onSubmit={handleAddAssociate} className="p-6 space-y-5 bg-white">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Name</label>
                    <Input required placeholder="John Doe" value={newAssociate.name} onChange={e => setNewAssociate({...newAssociate, name: e.target.value})} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</label>
                    <Input required type="email" placeholder="john@kalvium.com" value={newAssociate.email} onChange={e => setNewAssociate({...newAssociate, email: e.target.value})} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone</label>
                    <Input required placeholder="+91 9876543210" value={newAssociate.phone} onChange={e => setNewAssociate({...newAssociate, phone: e.target.value})} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Temporary Password</label>
                    <Input required type="password" placeholder="Min 6 characters" value={newAssociate.password} onChange={e => setNewAssociate({...newAssociate, password: e.target.value})} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <Button type="submit" className="w-full mt-8 rounded-xl bg-zinc-900 text-white hover:bg-black h-11 text-sm font-medium tracking-wide uppercase">Create Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search team..." 
              className="pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11 text-sm transition-all" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3">
            {filteredUsers.filter(u => u.role === 'executive').map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedAssociate(u)}
                className={`flex items-center gap-4 p-3 mb-1 cursor-pointer transition-all rounded-xl ${selectedAssociate?.id === u.id ? 'bg-zinc-900 text-white shadow-md translate-x-1' : 'hover:bg-zinc-50 text-zinc-900'}`}
              >
                <div className={`h-10 w-10 flex items-center justify-center text-sm font-semibold rounded-full ${selectedAssociate?.id === u.id ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                  {u.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className={`text-[11px] truncate mt-0.5 ${selectedAssociate?.id === u.id ? 'text-zinc-400' : 'text-zinc-500'}`}>{u.employeeId}</p>
                </div>
                {selectedAssociate?.id === u.id && <ChevronRight size={16} className={selectedAssociate?.id === u.id ? "text-zinc-400 mr-1" : "text-zinc-300"} />}
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
                <Search size={24} className="mb-2 opacity-20" />
                <p className="text-sm">No associates found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full gap-6 overflow-hidden">
        
        {/* TOP METRICS STRIP */}
        {!selectedAssociate ? (
          <div className="grid grid-cols-3 gap-6 shrink-0">
            {[
              { label: "Total Associates", value: totalAssociates, icon: Users },
              { label: "Global Visits Today", value: globalVisitsToday, icon: MapPin },
              { label: "Team Leads", value: totalLeads, icon: Briefcase }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group rounded-xl">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">{stat.label}</span>
                  <stat.icon className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                </div>
                <div className="text-5xl font-light text-zinc-900 tracking-tighter">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 shrink-0 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-zinc-900 text-white p-6 shadow-xl flex flex-col justify-between min-h-[140px] rounded-xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-medium truncate tracking-tight pr-2">{selectedAssociate.name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">{selectedAssociate.employeeId}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Tracking Toggle */}
                  {format(selectedDate, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd') && dailyTrackStatus && (
                    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${dailyTrackStatus === 'active' ? 'text-green-400' : 'text-zinc-400'}`}>
                        {dailyTrackStatus === 'active' ? 'Live' : 'Stopped'}
                      </span>
                      <button 
                        onClick={toggleTrackingStatus}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dailyTrackStatus === 'active' ? 'bg-green-500' : 'bg-zinc-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dailyTrackStatus === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}
                  <Popover>
                    <PopoverTrigger className="flex items-center justify-center p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-white border border-zinc-700">
                      <CalendarIcon className="h-4 w-4" />
                    </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl border-zinc-200" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase tracking-widest border border-zinc-700 rounded-lg">
                  {selectedAssociate.regionId}
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{format(selectedDate, "MMM d")}</span>
              </div>
            </div>
            
            <div className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[140px] group rounded-xl">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Visits (Selected Date)</span>
                <MapPin className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
              </div>
              <div className="text-5xl font-light text-zinc-900 tracking-tighter">{timeline.filter(t => t.type === 'visit').length}</div>
            </div>
          </div>
        )}

        {/* BOTTOM AREA (Map + Timeline) */}
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
            {/* The Map */}
            <div className="flex-1 bg-zinc-100 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] relative overflow-hidden group rounded-xl">
              <div className="absolute top-4 right-4 z-[400]">
                <button 
                  onClick={handleFetchLocation} 
                  disabled={isFetchingLocation}
                  className="bg-white/90 backdrop-blur text-zinc-900 border border-zinc-200 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-zinc-900 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-900 shadow-sm rounded-xl"
                >
                  {isFetchingLocation ? 'Fetching...' : 'Request Location'}
                </button>
              </div>
              <MapContainer
                center={route.length > 0 ? route[0] : [12.9716, 77.5946]}
                zoom={13}
                style={{ width: '100%', height: '100%', zIndex: 10 }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO'
                />
                {route.length > 0 && <Polyline positions={route} color="#ef4444" weight={4} opacity={0.9} dashArray="6, 8" />}
                {timeline.filter(t => t.lat !== undefined && t.lng !== undefined).length > 1 && (
                  <Polyline 
                    positions={timeline.filter(t => t.lat !== undefined && t.lng !== undefined).map(t => [t.lat, t.lng] as [number, number])} 
                    color="#3b82f6" 
                    weight={3} 
                    opacity={0.8} 
                    dashArray="4, 6" 
                  />
                )}
                {route.length > 0 && (
                  <Marker 
                    position={route[route.length - 1]}
                    icon={L.divIcon({ className: 'bg-transparent', html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px; color: #991b1b; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>', iconSize: [32, 32], iconAnchor: [16, 32] })}
                  >
                    <Popup className="rounded-xl">Current Location</Popup>
                  </Marker>
                )}
                {timeline.filter(t => t.lat !== undefined && t.lng !== undefined).map((stop, idx) => (
                  <Marker 
                    key={idx} 
                    position={[stop.lat, stop.lng]}
                    icon={L.divIcon({ className: 'bg-transparent', html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 24px; height: 24px; color: #fca5a5; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>', iconSize: [24, 24], iconAnchor: [12, 24] })}
                  >
                    <Popup className="rounded-xl">
                      <div className="font-sans">
                        <strong className="block text-zinc-900 mb-1">{stop.time}</strong>
                        <span className="text-zinc-600">{stop.event}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Recent Activity Timeline */}
            <div className="w-[340px] flex flex-col bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-900">Activity on {format(selectedDate, "MMM d")}</h3>
                <Clock size={14} className="text-zinc-400" />
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="relative border-l border-zinc-200 ml-2 space-y-8 pb-4">
                  {timeline.map((stop, idx) => {
                    return (
                      <div 
                        key={idx} 
                        className="relative pl-6 group cursor-pointer"
                        onClick={() => setSelectedActivity(stop)}
                      >
                        <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-white border-2 transition-colors rounded-full ${stop.type === 'ping' ? 'border-blue-500 group-hover:bg-blue-500' : stop.type === 'request' ? 'border-orange-500 group-hover:bg-orange-500' : 'border-zinc-900 group-hover:bg-zinc-900'}`} />
                        <p className="text-sm font-medium text-zinc-900 leading-tight group-hover:text-black transition-colors text-left">
                          {stop.event}
                        </p>
                        <p className="text-[11px] font-semibold text-zinc-400 mt-1.5 tracking-wider uppercase text-left">{stop.time}</p>
                      </div>
                    );
                  })}
                  {timeline.length === 0 && (
                    <div className="pl-6 text-sm text-zinc-500 pt-2 font-light italic">No activity for this date.</div>
                  )}
                </div>
              </div>
            </div>
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
