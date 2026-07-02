import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface TimelineActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: any;
}

export function TimelineActivityDialog({ open, onOpenChange, stop }: TimelineActivityDialogProps) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMeetings() {
      if (open && stop?.type === 'visit' && stop.data?.id) {
        setLoading(true);
        try {
          const q = query(collection(db, 'meetings'), where('visitId', '==', stop.data.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          } else {
            setMeetings([]);
          }
        } catch (error) {
          console.error("Failed to fetch meetings for visit:", error);
        } finally {
          setLoading(false);
        }
      } else if (!open) {
        setMeetings([]);
      }
    }
    fetchMeetings();
  }, [open, stop]);

  if (!stop) return null;

  // Fallback to check other potential photo fields just in case
  const photoUrl = stop.data?.photoWatermarkedUrl || stop.data?.photoOriginalUrl || stop.data?.photoUrl || stop.data?.checkInPhotoUrl;
  
  // Get all valid recording URLs from all meetings
  const audioUrls = meetings.map(m => m.recordingUrl).filter(url => !!url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Activity Details</DialogTitle>
          <DialogDescription>
            {stop.type === 'request' ? 'Location request details.' : 'Visit and location details.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">Time</p>
            <p className="text-sm text-zinc-600">{stop.time} ({new Date(stop.timestamp).toLocaleString()})</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">Event Type</p>
            <p className="text-sm text-zinc-600 capitalize">
              {stop.type === 'ping' ? 'Location Update' : stop.type === 'request' ? 'Location Request' : 'Check-in'}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">Details</p>
            <p className="text-sm text-zinc-600">{stop.event}</p>
          </div>
          {stop.status && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm text-zinc-600 capitalize">{stop.status}</p>
            </div>
          )}
          {stop.lat !== undefined && stop.lng !== undefined && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">Coordinates</p>
              <p className="text-sm text-zinc-600">{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</p>
            </div>
          )}
          
          {/* Photos */}
          {stop.type === 'visit' && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">Check-in Photo</p>
              {photoUrl ? (
                <div className="rounded-lg overflow-hidden border border-zinc-200">
                  <img src={photoUrl} alt="Check-in" className="w-full h-auto object-cover" />
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">No check-in photo recorded.</p>
              )}
            </div>
          )}

          {/* Audio */}
          {stop.type === 'visit' && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">Seminar Audio</p>
              {loading ? (
                <p className="text-sm text-zinc-500 animate-pulse">Loading audio...</p>
              ) : audioUrls.length > 0 ? (
                <div className="space-y-3">
                  {audioUrls.map((url, i) => (
                    <div key={i} className="bg-zinc-100 p-3 rounded-lg border border-zinc-200">
                      <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Recording {i + 1}</p>
                      <audio controls src={url} className="w-full h-10 outline-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">No seminar audio recorded for this visit.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
