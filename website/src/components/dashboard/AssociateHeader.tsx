import { Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string;
}

interface AssociateHeaderProps {
  selectedAssociate: User;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  dailyTrackStatus: 'active' | 'ended' | null;
  toggleTrackingStatus: () => void;
  timelineVisitsCount: number;
}

export function AssociateHeader({
  selectedAssociate,
  selectedDate,
  setSelectedDate,
  dailyTrackStatus,
  toggleTrackingStatus,
  timelineVisitsCount
}: AssociateHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-6 shrink-0 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-zinc-900 text-white p-6 shadow-xl flex flex-col justify-between min-h-[140px] rounded-xl relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-medium truncate tracking-tight pr-2">{selectedAssociate.name}</h3>
            <p className="text-zinc-400 text-sm mt-1">{selectedAssociate.regionId}</p>
          </div>
          <div className="flex items-center gap-3">
            {format(selectedDate, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd') && (
              <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${dailyTrackStatus === 'active' ? 'text-green-400' : 'text-zinc-400'}`}>
                  {dailyTrackStatus === 'active' ? 'Live' : 'Stopped'}
                </span>
                <button 
                  onClick={toggleTrackingStatus}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dailyTrackStatus === 'active' ? 'bg-green-500' : 'bg-zinc-600'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dailyTrackStatus === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            )}
            <Popover>
              <PopoverTrigger className="flex items-center justify-center p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-white border border-zinc-700">
                <CalendarIcon className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border-zinc-200" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase tracking-widest border border-zinc-700 rounded-lg">
            {selectedAssociate.regionId}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{format(selectedDate, "MMM d")}</span>
        </div>
      </div>
      
      <div className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[140px] group rounded-xl">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Visits (Selected Date)</span>
          <MapPin className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
        </div>
        <div className="text-5xl font-light text-zinc-900 tracking-tighter">{timelineVisitsCount}</div>
      </div>
    </div>
  );
}
