
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
    <div className="w-[320px] shrink-0 flex flex-col bg-white border border-gray-100 shadow-sm rounded-[20px]">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-gray-900 uppercase">Activity on {format(selectedDate, "MMM d")}</h3>
        <Clock size={14} className="text-gray-400" />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="relative border-l border-gray-100 ml-2 space-y-8 pb-4">
          {timeline.map((stop, idx) => {
            if (stop.isWarning) {
              return (
                <div key={idx} className="relative pl-8 group my-4">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-red-100 rounded-full z-0 flex items-center justify-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full z-10 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm transition-all duration-300 hover:shadow-md hover:border-red-300">
                    <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      🚨 {stop.event}
                    </p>
                    <p className="text-[13px] font-semibold text-red-900 leading-tight">{stop.details}</p>
                  </div>
                </div>
              );
            }
            if (stop.type === 'crm') {
              return (
                <div key={idx} className="relative pl-8 group my-4">
                  <div className="absolute -left-[9px] top-4 w-4 h-4 bg-emerald-100 rounded-full z-0 flex items-center justify-center transition-transform group-hover:scale-125 duration-300">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full z-10" />
                  </div>
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
                className="relative pl-8 group cursor-pointer my-4"
                onClick={() => {
                  if (stop.lat && stop.lng) {
                    setMapCenter([stop.lat, stop.lng]);
                    setMapZoom(16);
                  }
                  setSelectedActivity(stop);
                }}
              >
                <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full z-0 flex items-center justify-center transition-transform group-hover:scale-125 duration-300 ${stop.type === 'ping' ? 'bg-blue-100' : stop.type === 'request' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <span className={`w-2 h-2 rounded-full z-10 ${stop.type === 'ping' ? 'bg-blue-500' : stop.type === 'request' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                </div>
                
                <div className="bg-white border border-gray-100 rounded-xl p-3 transition-all duration-300 hover:shadow-sm hover:border-gray-200 hover:-translate-y-[1px] text-left">
                  <p className="text-[13px] font-bold text-gray-900 leading-tight transition-colors">
                    {stop.event}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mt-1">
                    {stop.time}
                  </p>
                </div>
              </div>
            );
          })}
          {timeline.length === 0 && (
            <div className="pl-6 text-sm text-gray-500 pt-2 font-light italic">No activity for this date.</div>
          )}
        </div>
      </div>
    </div>
  );
}
