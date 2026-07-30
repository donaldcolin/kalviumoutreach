import type { CrmActivity } from '@kalvium-outreach/shared';
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
      onClick={() => {
        if (activity.lat && activity.lng && onLocate) onLocate(activity.lat, activity.lng);
      }}
      className="cursor-pointer"
    >
      <p className="text-sm font-medium text-zinc-900 leading-tight group-hover:text-black transition-colors break-words text-left">
        {activity.schoolName || 'Unknown School'}
      </p>
      
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase text-left flex items-center gap-1.5">
          {formattedTime} {formattedDate && <><span className="text-zinc-300">·</span> {formattedDate}</>}
        </p>
        
        {onMoreDetails && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onMoreDetails();
            }}
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded"
          >
            More Details
          </button>
        )}
      </div>
    </div>
  );
}
