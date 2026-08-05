import { useState, useMemo, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../hooks/use-toast';
import { TimelineActivityDialog } from "../components/TimelineActivityDialog";
import { EmptyState } from '../components/ui/EmptyState';
import { buildTimeline, type TimelineEvent } from '../lib/timelineBuilder';

import { TeamSidebar } from '../components/dashboard/TeamSidebar';
import { GlobalStats } from '../components/dashboard/GlobalStats';
import { AssociateHeader } from '../components/dashboard/AssociateHeader';
import { AssociateMap } from '../components/dashboard/AssociateMap';
import { AssociateTimeline } from '../components/dashboard/AssociateTimeline';
import { Map as MapIcon, Loader2 } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Dashboard() {
  const { user, users } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssociate, setSelectedAssociate] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Dynamic Map Zoom/Center State
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Add Associate State
  const [selectedActivity, setSelectedActivity] = useState<TimelineEvent | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [expandedActivityIdx, setExpandedActivityIdx] = useState<number | null>(null);

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

  const visibleUsers = useMemo(() => {
    return Object.values(users);
  }, [users]);

  const {
    ongoingWalkIns,
    teamTrackingStatus,
    isStatsLoading,
    dailyTrackStatus,
    route,
    rawPings,
    routeCacheKey,
    selectedDateLocReqs,
    selectedDateCrmActivities,
    isFetchingLocation,
    isAssociateLoading,
    handleFetchLocation,
    toggleTrackingStatus,
  } = useDashboardData(
    user,
    visibleUsers,
    selectedAssociate,
    selectedDate,
    todayStart,
    todayEnd
  );

  const timeline = useMemo(() => {
    return buildTimeline(selectedDateLocReqs, selectedDateCrmActivities, rawPings);
  }, [selectedDateLocReqs, selectedDateCrmActivities, rawPings]);

  const filteredUsers = useMemo(() => {
    let result = visibleUsers;
    
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

  const routeStartLat = route.length > 0 ? route[0][0] : null;
  const routeStartLng = route.length > 0 ? route[0][1] : null;

  useEffect(() => {
    if (typeof routeStartLat === 'number' && typeof routeStartLng === 'number' && !isNaN(routeStartLat) && !isNaN(routeStartLng)) {
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
        isLoading={isStatsLoading}
      />

      <div className="flex-1 flex flex-col h-full gap-6 overflow-hidden">
        {!selectedAssociate ? (
          <GlobalStats
            totalAssociates={totalAssociates}
            activeWalkIns={Object.keys(ongoingWalkIns).length}
            isLoading={isStatsLoading}
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
        ) : isAssociateLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-gray-100">
            <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-4" />
            <p className="text-sm font-medium text-gray-500">Loading tracking data...</p>
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
