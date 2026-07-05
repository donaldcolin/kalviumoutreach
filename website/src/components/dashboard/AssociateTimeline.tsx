
import { Clock } from 'lucide-react';
import { format } from "date-fns";
import { CrmActivityCard } from '../CrmActivityCard';

interface AssociateTimelineProps {
  timeline: any[];
  selectedDate: Date;
  expandedActivityIdx: number | null;
  setExpandedActivityIdx: (idx: number | null) => void;
  setSelectedActivity: (activity: any) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
}

export function AssociateTimeline({
  timeline,
  selectedDate,
  expandedActivityIdx,
  setExpandedActivityIdx,
  setSelectedActivity,
  setMapCenter,
  setMapZoom
}: AssociateTimelineProps) {
  return (
    <div className="w-[340px] flex flex-col bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl">
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-900">Activity on {format(selectedDate, "MMM d")}</h3>
        <Clock size={14} className="text-zinc-400" />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="relative border-l border-zinc-200 ml-2 space-y-8 pb-4">
          {timeline.map((stop, idx) => {
            if (stop.type === 'crm') {
              return (
                <div key={idx} className="relative pl-6 group">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-white border-2 border-emerald-500 rounded-full z-10 transition-colors group-hover:bg-emerald-500" />
                  <CrmActivityCard 
                    activity={stop.data}
                    isExpanded={expandedActivityIdx === idx}
                    onToggle={() => setExpandedActivityIdx(expandedActivityIdx === idx ? null : idx)}
                    onLocate={(lat, lng) => {
                      setMapCenter([lat, lng]);
                      setMapZoom(16);
                    }}
                    onMoreDetails={() => setSelectedActivity(stop)}
                  />
                </div>
              );
            }
            return (
              <div 
                key={idx} 
                className="relative pl-6 group cursor-pointer"
                onClick={() => {
                  if (stop.lat && stop.lng) {
                    setMapCenter([stop.lat, stop.lng]);
                    setMapZoom(16);
                  }
                }}
              >
                <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-white border-2 transition-colors rounded-full ${stop.type === 'ping' ? 'border-blue-500 group-hover:bg-blue-500' : stop.type === 'request' ? 'border-orange-500 group-hover:bg-orange-500' : 'border-zinc-900 group-hover:bg-zinc-900'}`} />
                <p className="text-sm font-medium text-zinc-900 leading-tight group-hover:text-black transition-colors text-left">
                  {stop.event}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase text-left">{stop.time}</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActivity(stop);
                    }}
                    className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded"
                  >
                    More Details
                  </button>
                </div>
              </div>
            );
          })}
          {timeline.length === 0 && (
            <div className="pl-6 text-sm text-zinc-500 pt-2 font-light italic">No activity for this date.</div>
          )}
        </div>
      </div>
    </div>
  );
}
