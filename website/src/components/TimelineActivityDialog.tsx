import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { MapPin, Clock, Info, CheckCircle, FileAudio, Image as ImageIcon, X } from 'lucide-react';
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[425px]">
        <SheetHeader>
          <SheetTitle>Activity Details</SheetTitle>
          <SheetDescription>
            {stop.type === 'request' ? 'Location request details.' : 'Visit and location details.'}
          </SheetDescription>
        </SheetHeader>
        <div className="py-2 px-6 space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pb-24">
          
          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Time</p>
                <p className="text-sm font-medium text-zinc-900">{stop.time} <span className="text-zinc-500 font-normal">({new Date(stop.timestamp).toLocaleDateString()})</span></p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Event Details</p>
                <p className="text-sm font-medium text-zinc-900 capitalize mb-1">
                  {stop.type === 'ping' ? 'Location Update' : stop.type === 'request' ? 'Location Request' : 'Check-in'}
                </p>
                <p className="text-sm text-zinc-600">{stop.event}</p>
              </div>
            </div>

            {stop.status && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-medium text-emerald-600 capitalize bg-emerald-50 px-2 py-0.5 rounded-md inline-block">{stop.status}</p>
                </div>
              </div>
            )}

            {stop.lat !== undefined && stop.lng !== undefined && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Coordinates</p>
                  <p className="text-sm text-zinc-600 font-mono bg-zinc-100 px-2 py-1 rounded-md">{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Photos */}
          {stop.type === 'visit' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-zinc-700" />
                <h3 className="text-base font-semibold text-zinc-900">Check-in Photo</h3>
              </div>
              {photoUrl ? (
                <div className="rounded-2xl overflow-hidden border-2 border-zinc-100 shadow-sm">
                  <img src={photoUrl} alt="Check-in" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="bg-zinc-50 rounded-2xl p-6 text-center border border-zinc-100 border-dashed">
                  <p className="text-sm text-zinc-500 italic">No check-in photo recorded.</p>
                </div>
              )}
            </div>
          )}

          {/* Audio */}
          {stop.type === 'visit' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-zinc-700" />
                <h3 className="text-base font-semibold text-zinc-900">Seminar Audio</h3>
              </div>
              {loading ? (
                <div className="bg-zinc-50 rounded-2xl p-6 text-center border border-zinc-100 animate-pulse">
                  <p className="text-sm text-zinc-500">Loading audio...</p>
                </div>
              ) : audioUrls.length > 0 ? (
                <div className="space-y-3">
                  {audioUrls.map((url, i) => (
                    <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 shadow-sm transition-all hover:shadow-md">
                      <p className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Recording {i + 1}</p>
                      <audio controls src={url} className="w-full h-10 outline-none rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-50 rounded-2xl p-6 text-center border border-zinc-100 border-dashed">
                  <p className="text-sm text-zinc-500 italic">No seminar audio recorded for this visit.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Red Cancel Button at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-zinc-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-xl text-base font-semibold tracking-wide flex items-center justify-center gap-2"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
            Close Details
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
