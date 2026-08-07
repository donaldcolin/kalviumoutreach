import { Calendar as CalendarIcon, ClipboardList, Plus, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { AssignTaskModal } from './AssignTaskModal';

import type { User, CrmActivity } from '@kalvium-outreach/shared';

interface AssociateHeaderProps {
  selectedAssociate: User;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  dailyTrackStatus: 'active' | 'ended' | 'stale' | null;
  toggleTrackingStatus: () => void;
  timelineVisitsCount: number;
  ongoingWalkIn?: CrmActivity;
  isFetchingLocation: boolean;
  handleFetchLocation: () => void;
  cancelOngoingWalkIn: () => Promise<void>;
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
  handleFetchLocation,
  cancelOngoingWalkIn
}: AssociateHeaderProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-6 shrink-0 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] rounded-[20px] relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight pr-2">{selectedAssociate.name}</h3>
            <p className="text-gray-500 text-sm mt-1 font-medium">{selectedAssociate.regionId}</p>
          </div>
          <div className="flex items-center gap-3">
            {format(selectedDate, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd') && (
              dailyTrackStatus === 'stale' ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    App Closed
                  </span>
                  <button
                    onClick={toggleTrackingStatus}
                    className="ml-1 text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                  >
                    Restart
                  </button>
                </div>
              ) : (
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
              )
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
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <span className="inline-block px-3 py-1 bg-gray-50 text-gray-700 text-[11px] font-semibold uppercase tracking-widest border border-gray-100 rounded-lg shrink-0">
              {selectedAssociate.regionId}
            </span>
            {ongoingWalkIn && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1 min-w-0 pr-1 group/walkin">
                <div className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </div>
                <p className="text-[11px] font-medium text-green-700 truncate pr-1">
                  Currently at <span className="font-bold">{ongoingWalkIn.schoolName || 'In Walk-in'}</span>
                </p>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to end this walk-in remotely? This will clear it from the associate\'s app as well.')) {
                      await cancelOngoingWalkIn();
                    }
                  }}
                  className="flex items-center justify-center h-4 w-4 rounded-full bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-800 transition-colors opacity-0 group-hover/walkin:opacity-100 focus:opacity-100 focus:outline-none"
                  title="End Walk-in"
                >
                  <span className="sr-only">End Walk-in</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">{format(selectedDate, "MMM d")}</span>
        </div>
      </div>
      
      <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] group rounded-[20px] transition-all duration-300 hover:shadow-md hover:border-gray-200">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Activities (Selected Date)</span>
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:bg-gray-100 group-hover:text-gray-600">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-auto pt-4">
          <div className="text-[2.75rem] leading-none font-bold text-gray-900 tracking-tight">{timelineVisitsCount}</div>
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
