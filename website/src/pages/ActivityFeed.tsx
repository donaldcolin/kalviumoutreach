import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Play, Square, MapPin, Coffee, AlertTriangle, HelpCircle } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';

interface ActivityEvent {
  id: string;
  userId: string;
  timestamp: number;
  type: 'start' | 'stop' | 'stale' | 'school' | 'break' | 'unclassified';
  title: string;
  description: string;
}

export default function ActivityFeed() {
  const { user, users } = useAuthStore();
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  // Time boundaries for today
  const [todayStart, setTodayStart] = useState(() => new Date().setHours(0, 0, 0, 0));
  const [todayStr, setTodayStr] = useState(() => format(new Date(), 'yyyyMMdd'));

  useEffect(() => {
    const interval = setInterval(() => {
      const newStart = new Date().setHours(0, 0, 0, 0);
      if (newStart !== todayStart) {
        setTodayStart(newStart);
        setTodayStr(format(new Date(), 'yyyyMMdd'));
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [todayStart]);

  // Determine which users this person is allowed to see
  const visibleUsers = useMemo(() => {
    return Object.values(users);
  }, [users]);

  const visibleUserIds = useMemo(() => new Set(visibleUsers.map(u => u.id)), [visibleUsers]);

  useEffect(() => {
    if (!user) return;

    let trackEvents: ActivityEvent[] = [];
    let visitEvents: ActivityEvent[] = [];

    // 1. Subscribe to Daily Tracks for start/stop/stale
    const qTracks = query(
      collection(db, 'dailyTracks'),
      where('date', '==', todayStr)
    );
    
    const unsubTracks = onSnapshot(qTracks, (snapshot) => {
      const newTrackEvents: ActivityEvent[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const uid = data.userId;
        if (!uid || !visibleUserIds.has(uid)) return;

        // Start event
        if (data.startTime) {
          newTrackEvents.push({
            id: `${doc.id}_start`,
            userId: uid,
            timestamp: data.startTime,
            type: 'start',
            title: 'Started tracking',
            description: 'Began their day'
          });
        }

        // Stale event
        if (data.status === 'stale' && data.staleDetectedAt) {
          const staleTs = data.staleDetectedAt.toDate?.()?.getTime() || data.staleDetectedAt;
          if (staleTs) {
            newTrackEvents.push({
              id: `${doc.id}_stale`,
              userId: uid,
              timestamp: staleTs,
              type: 'stale',
              title: 'App Force-Closed',
              description: 'Tracking session became stale'
            });
          }
        }

        // End event
        if (data.status === 'ended' && data.lastPing) {
          // Approximate stop time with lastPing if explicit endTime doesn't exist
          const endTs = data.lastPing.toDate?.()?.getTime() || data.lastPing;
          if (endTs) {
            newTrackEvents.push({
              id: `${doc.id}_stop`,
              userId: uid,
              timestamp: endTs,
              type: 'stop',
              title: 'Stopped tracking',
              description: 'Ended their day'
            });
          }
        }
      });
      
      trackEvents = newTrackEvents;
      combineAndSort(trackEvents, visitEvents);
    });

    // 2. Subscribe to Visits for check-ins, breaks, etc.
    const qVisits = query(collection(db, 'visits'), where('timestamp', '>=', todayStart));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      const newVisitEvents: ActivityEvent[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const uid = data.executiveId;
        if (!uid || !visibleUserIds.has(uid)) return;
        
        let type: ActivityEvent['type'] = 'unclassified';
        let title = 'Unclassified Stop';
        let description = 'Recorded a stop without a category';

        if (data.type === 'school') {
          type = 'school';
          title = 'Checked in';
          description = data.schoolName || 'Unknown School';
        } else if (data.type === 'break') {
          type = 'break';
          title = 'Took a break';
          description = 'Stopped for a break';
        } else if (data.type === 'unclassified') {
          type = 'unclassified';
        }

        newVisitEvents.push({
          id: doc.id,
          userId: uid,
          timestamp: data.timestamp,
          type,
          title,
          description
        });
      });

      visitEvents = newVisitEvents;
      combineAndSort(trackEvents, visitEvents);
    });

    const combineAndSort = (tEvents: ActivityEvent[], vEvents: ActivityEvent[]) => {
      const combined = [...tEvents, ...vEvents];
      // Sort newest first
      combined.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(combined);
    };

    return () => {
      unsubTracks();
      unsubVisits();
    };
  }, [user, todayStr, todayStart, visibleUserIds]);

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'start': return <Play className="w-4 h-4 text-green-600" />;
      case 'stop': return <Square className="w-4 h-4 text-gray-600" />;
      case 'stale': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'school': return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'break': return <Coffee className="w-4 h-4 text-orange-600" />;
      case 'unclassified': return <HelpCircle className="w-4 h-4 text-purple-600" />;
    }
  };

  const getEventBg = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'start': return 'bg-green-100 border-green-200';
      case 'stop': return 'bg-gray-100 border-gray-200';
      case 'stale': return 'bg-amber-100 border-amber-200';
      case 'school': return 'bg-blue-100 border-blue-200';
      case 'break': return 'bg-orange-100 border-orange-200';
      case 'unclassified': return 'bg-purple-100 border-purple-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Activity Feed</h1>
          <p className="text-gray-500 mt-1 font-medium">Global timeline of today's team activities.</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden flex flex-col">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MapPin className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-lg font-medium">No activity yet today</p>
            <p className="text-sm">Team check-ins and tracking updates will appear here.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-6">
            <div className="relative border-l border-gray-100 ml-5 py-2">
              {events.map((event, i) => {
                const assoc = users[event.userId];
                if (!assoc) return null;

                return (
                  <div key={event.id} className={`relative pl-8 ${i !== events.length - 1 ? 'mb-8' : ''}`}>
                    <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${getEventBg(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-4 bg-gray-50/50 hover:bg-gray-50 transition-colors p-4 rounded-xl border border-gray-100">
                      <Avatar className="w-10 h-10 border border-gray-200 shrink-0">
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">
                          {assoc.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          {assoc.name}
                          <span className="text-xs font-normal text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-md">
                            {assoc.regionId}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5 font-medium">
                          <span className="font-semibold text-gray-900">{event.title}</span> — {event.description}
                        </p>
                      </div>

                      <div className="text-xs font-medium text-gray-400 whitespace-nowrap shrink-0 md:text-right">
                        {format(new Date(event.timestamp), 'h:mm a')}
                        <br className="hidden md:block" />
                        <span className="md:mt-0.5 inline-block ml-2 md:ml-0">
                          ({formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
