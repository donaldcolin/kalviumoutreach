import { Calendar as CalendarIcon, ClipboardList, Plus, Map as MapIcon } from 'lucide-react';
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
  isFetchingLocation: boolean;
  handleFetchLocation: () => void;
}

export function AssociateHeader({
  selectedAssociate,
  selectedDate,
  setSelectedDate,
  dailyTrackStatus,
  toggleTrackingStatus,
  timelineVisitsCount,
  ongoingWalkIn,
  isFetchingLocation,
  handleFetchLocation
}: AssociateHeaderProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-6 shrink-0 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] rounded-xl relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 tracking-tight pr-2">{selectedAssociate.name}</h3>
            <p className="text-gray-500 text-sm mt-1 font-medium">{selectedAssociate.regionId}</p>
          </div>
          <div className="flex items-center gap-3">
            {format(selectedDate, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd') && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${dailyTrackStatus === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                  {dailyTrackStatus === 'active' ? 'Live' : 'Stopped'}
                </span>
                <button 
                  onClick={toggleTrackingStatus}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dailyTrackStatus === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dailyTrackStatus === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            )}
            <Popover>
              <PopoverTrigger className="flex items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 border border-gray-100 shadow-sm">
                <CalendarIcon className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border-gray-100 shadow-sm" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  className="rounded-xl bg-white"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="inline-block px-3 py-1 bg-gray-50 text-gray-700 text-[11px] font-semibold uppercase tracking-widest border border-gray-100 rounded-lg">
              {selectedAssociate.regionId}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{format(selectedDate, "MMM d")}</span>
          </div>
          
          {ongoingWalkIn && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 mt-1">
              <div className="flex h-2 w-2 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <p className="text-xs font-medium text-green-700 truncate">
                Currently at <span className="font-bold">{ongoingWalkIn.schoolName || 'In Walk-in'}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] group rounded-xl">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-gray-500 tracking-wider uppercase">Activities (Selected Date)</span>
          <ClipboardList className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
        </div>
        <div className="flex items-end justify-between mt-auto pt-4">
          <div className="text-5xl font-semibold text-gray-900 tracking-tighter">{timelineVisitsCount}</div>
          <div className="flex gap-2">
            <button
              onClick={handleFetchLocation}
              disabled={isFetchingLocation}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <MapIcon className="h-4 w-4" />
              {isFetchingLocation ? 'Fetching...' : 'Request Location'}
            </button>
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Assign Task
            </button>
          </div>
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
