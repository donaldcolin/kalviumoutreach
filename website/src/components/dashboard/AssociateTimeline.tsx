
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
    <div className="w-[280px] flex flex-col bg-white border border-gray-100 shadow-sm rounded-xl">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-gray-900">Activity on {format(selectedDate, "MMM d")}</h3>
        <Clock size={14} className="text-gray-400" />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="relative border-l border-gray-100 ml-2 space-y-8 pb-4">
          {timeline.map((stop, idx) => {
            if (stop.isWarning) {
              return (
                <div key={idx} className="relative pl-6 group my-4">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-red-500 rounded-full z-10 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      🚨 {stop.event}
                    </p>
                    <p className="text-sm font-medium text-red-900">{stop.details}</p>
                  </div>
                </div>
              );
            }
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
                <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-white border-2 transition-colors rounded-full ${stop.type === 'ping' ? 'border-blue-500 group-hover:bg-blue-500' : stop.type === 'request' ? 'border-orange-500 group-hover:bg-orange-500' : 'border-gray-900 group-hover:bg-gray-900'}`} />
                <p className="text-sm font-medium text-gray-900 leading-tight group-hover:text-black transition-colors text-left">
                  {stop.event}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] font-medium text-gray-500 tracking-wider text-left">{stop.time}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActivity(stop);
                    }}
                    className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    More Details
                  </button>
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
