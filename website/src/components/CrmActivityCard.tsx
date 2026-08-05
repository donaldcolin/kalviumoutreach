import type { CrmActivity } from '@kalvium-outreach/shared';
import { ChevronRight } from 'lucide-react';
interface CrmActivityCardProps {
  activity: CrmActivity;
  isExpanded: boolean;
  onToggle: () => void;
  onLocate?: (lat: number, lng: number) => void;
  onMoreDetails?: () => void;
}


export function CrmActivityCard({ activity, onLocate, onMoreDetails }: CrmActivityCardProps) {
  const visitDate = activity.walkInDateTime || activity.lsqCreatedOn;
  const formattedDate = visitDate ? new Date(visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const formattedTime = visitDate ? new Date(visitDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div 
      onClick={(e) => {
        // If clicking the card, we want to show details. If onLocate is needed, maybe clicking the map pin icon is better, but since it's the whole card, let's trigger more details by default
        if (onMoreDetails) {
          onMoreDetails();
        } else if (activity.lat && activity.lng && onLocate) {
          onLocate(activity.lat, activity.lng);
        }
      }}
      className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:shadow-sm hover:border-gray-200 hover:-translate-y-[1px] group/card text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900 leading-tight group-hover/card:text-black transition-colors truncate">
            {activity.schoolName || 'Unknown School'}
          </p>
          <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mt-1">
            {formattedTime} {formattedDate && <span className="font-normal opacity-50">· {formattedDate}</span>}
          </p>
        </div>
        
        {onMoreDetails && (
          <div className="shrink-0 h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 transition-all duration-300 group-hover/card:bg-gray-100 group-hover/card:text-gray-900 group-hover/card:translate-x-0.5">
            <ChevronRight size={14} strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
}
