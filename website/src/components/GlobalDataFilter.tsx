import { Filter, Search, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';

import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface GlobalDataFilterProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
  associateFilter: string;
  setAssociateFilter: (val: string) => void;
  taskTypeFilter?: string;
  setTaskTypeFilter?: (val: string) => void;
  executives: { id: string; name: string; email?: string }[];
  managerFilter?: string;
  setManagerFilter?: (val: string) => void;
  managers?: { id: string; name: string }[];
  userRole?: string;
}

export function GlobalDataFilter({
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  associateFilter,
  setAssociateFilter,
  taskTypeFilter,
  setTaskTypeFilter,
  executives,
  managerFilter = 'all',
  setManagerFilter,
  managers = [],
  userRole = 'executive'
}: GlobalDataFilterProps) {
  // Count active filters
  let activeFilters = 0;
  if (searchQuery) activeFilters++;
  if (dateFilter) activeFilters++;
  if (associateFilter !== 'all') activeFilters++;
  if (taskTypeFilter && taskTypeFilter !== 'all') activeFilters++;
  if (managerFilter !== 'all') activeFilters++;

  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 outline-none">
        <Filter className="w-4 h-4" />
        Filters
        {activeFilters > 0 && (
          <span className="flex items-center justify-center w-5 h-5 ml-1 text-[10px] font-bold text-white bg-blue-600 rounded-full">
            {activeFilters}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end" sideOffset={8}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2 text-gray-900">Search Schools</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by school name..." 
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-medium text-sm text-gray-900">Filter by Date</h4>
            <Popover>
              <PopoverTrigger
                className={cn(
                  "flex items-center w-full justify-start text-left font-normal h-9 px-3 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50 outline-none",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {dateFilter ? format(new Date(dateFilter), "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter ? new Date(dateFilter) : undefined}
                  onSelect={(date: any) => {
                    if (date) {
                      const tzDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      setDateFilter(tzDate);
                    } else {
                      setDateFilter('');
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(userRole === 'admin' || userRole === 'regionalManager') && setManagerFilter && managers.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-900">Team</h4>
              <select
                value={managerFilter}
                onChange={(e) => {
                  setManagerFilter(e.target.value);
                  setAssociateFilter('all'); // Reset associate when team changes
                }}
                className="w-full rounded-md border border-gray-200 bg-white h-9 text-sm px-3 outline-none focus:border-gray-400"
              >
                <option value="all">All Teams</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}'s Team</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <h4 className="font-medium text-sm mb-2 text-gray-900">Associate</h4>
            <select
              value={associateFilter}
              onChange={(e) => setAssociateFilter(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white h-9 text-sm px-3 outline-none focus:border-gray-400"
            >
              <option value="all">All Associates</option>
              {executives.map(ex => (
                <option key={ex.id} value={ex.email?.toLowerCase() || ''}>{ex.name}</option>
              ))}
            </select>
          </div>

          {setTaskTypeFilter && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-900">Task Type</h4>
              <select 
                value={taskTypeFilter}
                onChange={(e) => setTaskTypeFilter(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white h-9 text-sm px-3 outline-none focus:border-gray-400"
              >
                <option value="all">All Task Types</option>
                <option value="seminar">Seminars Only</option>
                <option value="follow_up">Follow-ups Only</option>
              </select>
            </div>
          )}
          
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('');
                setAssociateFilter('all');
                if (setTaskTypeFilter) setTaskTypeFilter('all');
                if (setManagerFilter) setManagerFilter('all');
              }}
              className="w-full mt-2 text-sm text-red-600 hover:text-red-700 font-medium py-1"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
