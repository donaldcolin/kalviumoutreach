import { Calendar as CalendarIcon, ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { AssignTaskModal } from './AssignTaskModal';

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
  ongoingWalkIn?: any;
}

export function AssociateHeader({
  selectedAssociate,
  selectedDate,
  setSelectedDate,
  dailyTrackStatus,
  toggleTrackingStatus,
  timelineVisitsCount,
  ongoingWalkIn
}: AssociateHeaderProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  return (
    <>
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
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase tracking-widest border border-zinc-700 rounded-lg">
              {selectedAssociate.regionId}
            </span>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{format(selectedDate, "MMM d")}</span>
          </div>
          
          {ongoingWalkIn && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2 mt-1">
              <div className="flex h-2 w-2 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <p className="text-xs font-medium text-green-400 truncate">
                Currently at <span className="font-bold text-white">{ongoingWalkIn.schoolName || 'In Walk-in'}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[140px] group rounded-xl">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Activities (Selected Date)</span>
          <ClipboardList className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
        </div>
        <div className="flex items-end justify-between mt-auto pt-4">
          <div className="text-5xl font-light text-zinc-900 tracking-tighter">{timelineVisitsCount}</div>
          <button 
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Assign Task
          </button>
        </div>
      </div>
    </div>
    <AssignTaskModal 
      isOpen={isAssignModalOpen} 
      onClose={() => setIsAssignModalOpen(false)} 
      selectedAssociate={selectedAssociate} 
    />
    </>
  );
}
