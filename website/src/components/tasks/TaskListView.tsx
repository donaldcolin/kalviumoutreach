import { format } from 'date-fns';
import { TaskActionMenu } from './TaskActionMenu';
import type { Task, User } from '@kalvium-outreach/shared';
import { AlertCircle, Clock, CalendarCheck, CheckCircle2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

interface TaskListViewProps {
  tasks: Task[];
  users: Record<string, User>;
  categorize: (task: Task) => 'overdue' | 'today' | 'upcoming' | 'completed';
  onSnooze: (taskId: string, date: Date) => void;
  onPostpone: (taskId: string, date: Date) => void;
  onPushToToday: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const statusConfig = {
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500' },
  today: { label: 'Today', icon: CalendarCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
  upcoming: { label: 'Upcoming', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-100', dot: 'bg-blue-500' },
  completed: { label: 'Done', icon: CheckCircle2, color: 'text-gray-500 bg-gray-50 border-gray-100', dot: 'bg-gray-400' },
};

type SortKey = 'date' | 'associate' | 'school' | 'status';

export function TaskListView({ tasks, users, categorize, onSnooze, onPostpone, onPushToToday, onComplete, onDelete }: TaskListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...tasks].sort((a, b) => {
    const aCat = categorize(a);
    const bCat = categorize(b);

    if (aCat === 'completed' && bCat !== 'completed') return 1;
    if (bCat === 'completed' && aCat !== 'completed') return -1;

    let cmp = 0;
    if (sortKey === 'date') {
      cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    } else if (sortKey === 'associate') {
      cmp = (users[a.executiveId]?.name || '').localeCompare(users[b.executiveId]?.name || '');
    } else if (sortKey === 'school') {
      cmp = (a.schoolName || '').localeCompare(b.schoolName || '');
    } else if (sortKey === 'status') {
      const order = { overdue: 0, today: 1, upcoming: 2, completed: 3 };
      cmp = order[aCat] - order[bCat];
    }
    return sortAsc ? cmp : -cmp;
  });

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CalendarCheck size={48} strokeWidth={1.5} className="mb-4" />
        <p className="text-lg font-semibold text-gray-500">No tasks found</p>
        <p className="text-sm">Try adjusting your filters or assign a new task.</p>
      </div>
    );
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors"
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === field ? 'text-gray-700' : 'text-gray-300'} />
    </button>
  );

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Table header */}
      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1.2fr_auto] gap-4 px-5 py-3 bg-gray-50/80 border-b border-gray-100">
        <SortHeader label="Associate" field="associate" />
        <SortHeader label="School" field="school" />
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Type</div>
        <SortHeader label="Date" field="date" />
        <SortHeader label="Status" field="status" />
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</div>
      </div>

      {/* Table rows */}
      {sorted.map((task) => {
        const cat = categorize(task);
        const cfg = statusConfig[cat];
        const Icon = cfg.icon;
        const assocName = users[task.executiveId]?.name || 'Unknown';
        const taskDate = task.date ? new Date(task.date) : null;
        const isSnoozed = task.snoozedUntil && new Date(task.snoozedUntil) > new Date();

        return (
          <div
            key={task.id}
            className={`grid grid-cols-[1.5fr_2fr_1fr_1fr_1.2fr_auto] gap-4 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center ${cat === 'completed' ? 'opacity-60' : ''}`}
          >
            {/* Associate */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                {assocName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <span className="text-sm font-medium text-gray-800 truncate">{assocName}</span>
            </div>

            {/* School */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-gray-800 font-medium truncate">{task.schoolName || '—'}</span>
              {task.notes && task.notes !== task.schoolName && (
                <span className="text-[11px] text-gray-400 truncate">{task.notes}</span>
              )}
            </div>

            {/* Type */}
            <div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                task.type === 'seminar' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {task.type === 'seminar' ? 'Seminar' : 'Follow-up'}
              </span>
            </div>

            {/* Date */}
            <div className="text-sm text-gray-600">
              {taskDate ? format(taskDate, 'dd MMM') : '—'}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${cfg.color}`}>
                <Icon size={12} />
                {cfg.label}
              </span>
              {isSnoozed && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  SNOOZED
                </span>
              )}
            </div>

            {/* Actions */}
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
        );
      })}
    </div>
  );
}
