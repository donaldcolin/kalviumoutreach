import { useEffect, useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { MapPin, Clock, Info, CheckCircle, FileAudio, Image as ImageIcon, X, User, Phone, FileText, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { STAGE_SHORT, STAGE_COLORS, getStageIndex } from '../lib/constants';

interface TimelineActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: any;
}

export function TimelineActivityDialog({ open, onOpenChange, stop }: TimelineActivityDialogProps) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historicalVisits, setHistoricalVisits] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMeetings() {
      if (open && stop?.type === 'visit' && stop.data?.id) {
        setLoading(true);
        try {
          const q = query(collection(db, 'meetings'), where('visitId', '==', stop.data.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setMeetings(snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) })));
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
    
    async function fetchHistoricalVisits() {
      if (open && stop?.type === 'crm' && stop.data) {
        try {
          let q;
          if (stop.data.lsqLeadId) {
            q = query(collection(db, 'crmActivities'), where('lsqLeadId', '==', stop.data.lsqLeadId));
          } else if (stop.data.schoolName) {
            // Fallback if no lead ID
            q = query(
              collection(db, 'crmActivities'), 
              where('schoolName', '==', stop.data.schoolName),
              where('executiveId', '==', stop.data.executiveId)
            );
          }
          if (q) {
            const snap = await getDocs(q);
            if (!snap.empty) {
              const visits = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
              // Sort chronologically (oldest first)
              visits.sort((a, b) => {
                const timeA = a.walkInDateTime ? new Date(a.walkInDateTime).getTime() : 0;
                const timeB = b.walkInDateTime ? new Date(b.walkInDateTime).getTime() : 0;
                return timeA - timeB;
              });
              setHistoricalVisits(visits);
            } else {
              setHistoricalVisits([stop.data]); // Fallback to current stop
            }
          }
        } catch (error) {
          console.error("Failed to fetch historical visits:", error);
          setHistoricalVisits([stop.data]); // Fallback
        }
      } else if (!open) {
        setHistoricalVisits([]);
      }
    }

    fetchMeetings();
    fetchHistoricalVisits();
  }, [open, stop]);

  // Compute historical dates for each stage
  const historicalDates = useMemo(() => {
    const dates = new Map<number, string>();
    historicalVisits.forEach(v => {
      let maxStageIndex = getStageIndex(v.walkInStatus);
      
      // Also check if seminar was confirmed (Stage 4)
      if (v.walkInStatus?.includes('Seminar Confirmed') || v.seminarAppointmentDate) {
        maxStageIndex = Math.max(maxStageIndex, 4); 
      }

      const dateStr = v.walkInDateTime ? new Date(v.walkInDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      
      if (dateStr) {
        for (let i = 0; i <= maxStageIndex; i++) {
          if (!dates.has(i)) {
            dates.set(i, dateStr);
          }
        }
      }
    });
    return dates;
  }, [historicalVisits]);

  const overallMaxStage = historicalDates.size > 0 ? Math.max(...Array.from(historicalDates.keys())) : -1;

  if (!stop) return null;

  // Fallback to check other potential photo fields just in case
  const photoUrl = stop.data?.photoWatermarkedUrl || stop.data?.photoOriginalUrl || stop.data?.photoUrl || stop.data?.checkInPhotoUrl;
  
  // Get all valid recording URLs from all meetings
  const audioUrls = meetings.map(m => m.recordingUrl).filter(url => !!url);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[425px]">
        <SheetHeader className="pb-4 border-b border-zinc-100">
          <SheetTitle className="text-xl">Activity Details</SheetTitle>
          <SheetDescription>
            {stop.type === 'request' ? 'Location request details.' : 'Visit and historical progression.'}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 px-6 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pb-24 bg-zinc-50/50">
          
          {/* CRM Details */}
          {stop.type === 'crm' && stop.data && (
            <div className="space-y-4">
              
              {/* Stage Progress Bar (Historical) */}
              {(overallMaxStage >= 0 || stop.data.walkInStatus) && (
                <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock size={14} className="stroke-[2.5]" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Historical Timeline</h3>
                  </div>
                  
                  <div className="flex items-start justify-between relative mt-2 px-2">
                    {STAGE_SHORT.map((label, i) => {
                      const isReached = i <= overallMaxStage;
                      const dateReached = historicalDates.get(i);
                      const colorClass = STAGE_COLORS[i]; 

                      return (
                        <div key={label} className="flex flex-col items-center flex-1 relative z-10">
                          {/* Line connector */}
                          {i < STAGE_SHORT.length - 1 && (
                            <div className={`absolute top-3 left-[50%] w-full h-[3px] -z-10 ${
                              i < overallMaxStage ? colorClass : 'bg-zinc-100'
                            }`} />
                          )}

                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300 ${
                            isReached 
                              ? `${colorClass} border-transparent text-white shadow-sm scale-110` 
                              : 'bg-white border-zinc-200 text-zinc-400'
                          }`}>
                            {isReached ? <CheckCircle size={14} strokeWidth={2.5} /> : i + 1}
                          </div>
                          
                          <span className={`mt-3 text-[10px] font-bold tracking-wide transition-colors ${isReached ? 'text-zinc-800' : 'text-zinc-400'}`}>
                            {label}
                          </span>
                          <span className="text-[9px] font-semibold text-zinc-500 mt-1 h-3 text-center">
                            {dateReached || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Outcome */}
              {(stop.data.refusedEntryReason || stop.data.statusFrontDesk || stop.data.statusPIC || stop.data.statusPrincipal) && (
                <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Latest Outcome</p>
                  </div>
                  <p className="text-sm text-zinc-900 font-medium pl-3.5 border-l-2 border-zinc-100 py-1">
                    {getStageIndex(stop.data.walkInStatus) === 0 ? stop.data.refusedEntryReason :
                     getStageIndex(stop.data.walkInStatus) === 1 ? stop.data.statusFrontDesk :
                     getStageIndex(stop.data.walkInStatus) === 2 ? stop.data.statusPIC :
                     stop.data.statusPrincipal}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              {(stop.data.picName || stop.data.principalName) && (
                <div className="grid grid-cols-2 gap-3">
                  {stop.data.picName && (
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-1.5 mb-3">
                        <User size={14} className="text-blue-500" />
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">PIC</p>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 truncate">{stop.data.picName}</p>
                      {stop.data.picPhone && (
                        <p className="text-[11px] font-medium text-zinc-600 mt-1 flex items-center gap-1.5">
                          <Phone size={10} /> {stop.data.picPhone}
                        </p>
                      )}
                    </div>
                  )}
                  {stop.data.principalName && (
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-1.5 mb-3">
                        <User size={14} className="text-indigo-500" />
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Principal</p>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 truncate">{stop.data.principalName}</p>
                      {stop.data.principalPhone && (
                        <p className="text-[11px] font-medium text-zinc-600 mt-1 flex items-center gap-1.5">
                          <Phone size={10} /> {stop.data.principalPhone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {stop.data.notes && (
                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-amber-500" />
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Notes</p>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100">{stop.data.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                {stop.data.lsqLeadId && (
                  <a
                    href={`https://run.leadsquared.com/LeadManagement/LeadDetails?LeadID=${stop.data.lsqLeadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} /> LSQ Lead
                  </a>
                )}
                {stop.data.boardOfSchool && (
                  <span className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                    {stop.data.boardOfSchool}
                  </span>
                )}
                {stop.data.studentStrength && (
                  <span className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                    {stop.data.studentStrength} Students
                  </span>
                )}
                {stop.data.proposalSentToSchool === 'Yes' && (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-200 shadow-sm">
                    Proposal Sent
                  </span>
                )}
                {stop.data.followUpDate && (
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-200 flex items-center gap-1.5 shadow-sm">
                    <CalendarIcon size={12} /> Follow-up: {new Date(stop.data.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {stop.data.isValidWalkIn !== undefined && (
                  <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex items-center gap-1.5 shadow-sm ${stop.data.isValidWalkIn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <MapPin size={12} /> {stop.data.isValidWalkIn ? 'Valid Location' : 'Fake Location'} {stop.data.distanceMeters != null ? `(${stop.data.distanceMeters}m)` : ''}
                  </span>
                )}
              </div>
            </div>
          )}
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

            {stop.lat != null && stop.lng != null && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Coordinates</p>
                  <p className="text-sm text-zinc-600 font-mono bg-zinc-100 px-2 py-1 rounded-md">{stop.lat?.toFixed(6)}, {stop.lng?.toFixed(6)}</p>
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
