import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle, CalendarCheck, Clock, X } from 'lucide-react';
import { TaskActionMenu } from './TaskActionMenu';
import type { Task, User } from '@kalvium-outreach/shared';

interface TaskCalendarViewProps {
  tasks: Task[];
  users: Record<string, User>;
  categorize: (task: Task) => 'overdue' | 'today' | 'upcoming' | 'completed';
  onSnooze: (taskId: string, date: Date) => void;
  onPostpone: (taskId: string, date: Date) => void;
  onPushToToday: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dotColors = {
  overdue: 'bg-red-500',
  today: 'bg-emerald-500',
  upcoming: 'bg-blue-500',
  completed: 'bg-gray-300',
};

export function TaskCalendarView({ tasks, users, categorize, onSnooze, onPostpone, onPushToToday, onComplete, onDelete }: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start with empty cells for alignment
  const startPad = getDay(monthStart);

  // Group tasks by date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (!t.date) return;
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [tasks]);

  const selectedDayTasks = selectedDay
    ? tasksByDate.get(format(selectedDay, 'yyyy-MM-dd')) || []
    : [];

  return (
    <div className="flex gap-6">
      {/* Calendar grid */}
      <div className="flex-1 bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DOW.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty padding cells */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />
          ))}

          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            // Count by category
            const counts = { overdue: 0, today: 0, upcoming: 0, completed: 0 };
            dayTasks.forEach(t => { counts[categorize(t)]++; });

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[80px] p-2 border-b border-r border-gray-50 text-left transition-colors flex flex-col ${
                  isSelected ? 'bg-gray-900 text-white' : isToday ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-semibold ${
                  isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {format(day, 'd')}
                </span>

                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {counts.overdue > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-400' : dotColors.overdue}`} title={`${counts.overdue} overdue`} />}
                    {counts.today > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : dotColors.today}`} title={`${counts.today} today`} />}
                    {counts.upcoming > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : dotColors.upcoming}`} title={`${counts.upcoming} upcoming`} />}
                    {counts.completed > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-gray-400' : dotColors.completed}`} title={`${counts.completed} done`} />}
                  </div>
                )}

                {dayTasks.length > 0 && (
                  <span className={`text-[10px] font-medium mt-auto ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel — tasks for selected day */}
      {selectedDay && (
        <div className="w-80 bg-white border border-gray-100 rounded-xl overflow-hidden shrink-0 self-start sticky top-6">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">{format(selectedDay, 'EEEE, dd MMM')}</p>
              <p className="text-[11px] text-gray-400">{selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400">
              <X size={16} />
            </button>
          </div>

          <div className="p-3 flex flex-col gap-2 max-h-[500px] overflow-y-auto">
            {selectedDayTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tasks on this day</p>
            ) : (
              selectedDayTasks.map(task => {
                const cat = categorize(task);
                const assocName = users[task.executiveId]?.name || 'Unknown';
                return (
                  <div key={task.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate flex-1">{task.schoolName || '—'}</p>
                      <TaskActionMenu
                        task={task}
                        category={cat}
                        onSnooze={onSnooze}
                        onPostpone={onPostpone}
                        onPushToToday={onPushToToday}
                        onComplete={onComplete}
                        onDelete={onDelete}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">{assocName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        task.type === 'seminar' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {task.type === 'seminar' ? 'Seminar' : 'Follow-up'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
