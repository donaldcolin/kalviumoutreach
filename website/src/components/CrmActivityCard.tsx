import { ChevronRight, MapPin, Phone, User, Calendar, FileText, ArrowRight } from 'lucide-react';

interface CrmActivity {
  lsqActivityId: string;
  schoolName: string;
  activityType: string;
  typeOfWalkIn: string;
  walkInStatus: string;
  walkInDateTime: string;
  notes: string;
  refusedEntryReason: string;
  statusFrontDesk: string;
  statusPIC: string;
  statusPrincipal: string;
  picName: string;
  picPhone: string;
  principalName: string;
  principalPhone: string;
  lat: number | null;
  lng: number | null;
  livePhotoUrl: string;
  proposalSentToSchool: string;
  followUpDate: string;
  boardOfSchool: string;
  studentStrength: string;
  executiveEmail: string;
  lsqCreatedOn: string;
}

interface CrmActivityCardProps {
  activity: CrmActivity;
  isExpanded: boolean;
  onToggle: () => void;
  onLocate?: (lat: number, lng: number) => void;
}

const STAGE_ORDER = ['Refused Entry - RE', 'Front Desk Interaction - FDI', 'PIC Interaction - PCI', 'Principal Interaction - PI'];
const STAGE_SHORT = ['RE', 'FDI', 'PCI', 'PI'];
const STAGE_COLORS = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

function getStageIndex(walkInStatus: string): number {
  if (!walkInStatus) return -1;
  const idx = STAGE_ORDER.findIndex(s => walkInStatus.includes(s.split(' - ')[1]) || walkInStatus.includes(s));
  return idx;
}

export function CrmActivityCard({ activity, isExpanded, onToggle, onLocate }: CrmActivityCardProps) {
  const stageIdx = getStageIndex(activity.walkInStatus);
  
  // Get the outcome text for the current stage
  let outcomeText = '';
  if (stageIdx === 0) outcomeText = activity.refusedEntryReason;
  else if (stageIdx === 1) outcomeText = activity.statusFrontDesk;
  else if (stageIdx === 2) outcomeText = activity.statusPIC;
  else if (stageIdx === 3) outcomeText = activity.statusPrincipal;

  const visitDate = activity.walkInDateTime || activity.lsqCreatedOn;
  const formattedDate = visitDate ? new Date(visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const formattedTime = visitDate ? new Date(visitDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all hover:shadow-md">
      {/* Header — always visible */}
      <button 
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-50/50 transition-colors"
      >
        {/* Stage indicator dot */}
        <div className={`w-3 h-3 rounded-full shrink-0 ${stageIdx >= 0 ? STAGE_COLORS[stageIdx] : 'bg-zinc-300'}`} />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{activity.schoolName || 'Unknown School'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {activity.typeOfWalkIn || activity.activityType || 'Visit'}
            </span>
            {activity.walkInStatus && (
              <>
                <span className="text-zinc-300">·</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${stageIdx >= 0 ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  {STAGE_SHORT[stageIdx] || activity.walkInStatus}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{formattedTime}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{formattedDate}</p>
        </div>
        
        <ChevronRight size={14} className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-zinc-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 bg-zinc-50/30">
          {/* Stage Progress Bar */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Visit Progress</p>
            <div className="flex items-center gap-1">
              {STAGE_SHORT.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className={`flex-1 h-2 rounded-full ${i <= stageIdx ? STAGE_COLORS[i] : 'bg-zinc-200'}`} />
                  {i < STAGE_SHORT.length - 1 && <ArrowRight size={10} className="text-zinc-300 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {STAGE_SHORT.map((label, i) => (
                <span key={label} className={`text-[9px] font-bold tracking-wider ${i <= stageIdx ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
              ))}
            </div>
          </div>

          {/* Outcome */}
          {outcomeText && (
            <div className="bg-white p-3 rounded-lg border border-zinc-200">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Outcome</p>
              <p className="text-sm text-zinc-900 font-medium">{outcomeText}</p>
            </div>
          )}

          {/* Contact Info */}
          {(activity.picName || activity.principalName) && (
            <div className="grid grid-cols-2 gap-3">
              {activity.picName && (
                <div className="bg-white p-3 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={10} className="text-zinc-400" />
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">PIC</p>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 truncate">{activity.picName}</p>
                  {activity.picPhone && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Phone size={9} /> {activity.picPhone}
                    </p>
                  )}
                </div>
              )}
              {activity.principalName && (
                <div className="bg-white p-3 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={10} className="text-zinc-400" />
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Principal</p>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 truncate">{activity.principalName}</p>
                  {activity.principalPhone && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Phone size={9} /> {activity.principalPhone}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div className="bg-white p-3 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={10} className="text-zinc-400" />
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Notes</p>
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed">{activity.notes}</p>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 flex-wrap">
            {activity.boardOfSchool && (
              <span className="px-2 py-1 bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {activity.boardOfSchool}
              </span>
            )}
            {activity.studentStrength && (
              <span className="px-2 py-1 bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {activity.studentStrength} Students
              </span>
            )}
            {activity.proposalSentToSchool === 'Yes' && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                Proposal Sent
              </span>
            )}
            {activity.followUpDate && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                <Calendar size={9} /> Follow-up: {new Date(activity.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Location button */}
          {activity.lat && activity.lng && onLocate && (
            <button
              onClick={() => onLocate(activity.lat!, activity.lng!)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors"
            >
              <MapPin size={12} /> View on Map
            </button>
          )}
        </div>
      )}
    </div>
  );
}
