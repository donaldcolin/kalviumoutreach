import { format } from 'date-fns';
import { TaskActionMenu } from './TaskActionMenu';
import type { Task, User } from '@kalvium-outreach/shared';
import { AlertCircle, Clock, CalendarCheck, CheckCircle2 } from 'lucide-react';

interface TaskCardViewProps {
  tasks: Task[];
  users: Record<string, User>;
  executives: User[];
  categorize: (task: Task) => 'overdue' | 'today' | 'upcoming' | 'completed';
  onSnooze: (taskId: string, date: Date) => void;
  onPostpone: (taskId: string, date: Date) => void;
  onPushToToday: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const statusBorder = {
  overdue: 'border-l-red-500',
  today: 'border-l-emerald-500',
  upcoming: 'border-l-blue-500',
  completed: 'border-l-gray-300',
};

const statusBadge = {
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-600', icon: AlertCircle },
  today: { label: 'Today', cls: 'bg-emerald-50 text-emerald-600', icon: CalendarCheck },
  upcoming: { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600', icon: Clock },
  completed: { label: 'Done', cls: 'bg-gray-50 text-gray-500', icon: CheckCircle2 },
};

export function TaskCardView({ tasks, executives, categorize, onSnooze, onPostpone, onPushToToday, onComplete, onDelete }: TaskCardViewProps) {
  // Group tasks by associate
  const grouped = new Map<string, Task[]>();
  tasks.forEach(t => {
    const list = grouped.get(t.executiveId) || [];
    list.push(t);
    grouped.set(t.executiveId, list);
  });

  // Sort associates by number of overdue tasks (most urgent first)
  const sortedExecs = executives
    .filter(e => grouped.has(e.id))
    .sort((a, b) => {
      const aOverdue = (grouped.get(a.id) || []).filter(t => categorize(t) === 'overdue').length;
      const bOverdue = (grouped.get(b.id) || []).filter(t => categorize(t) === 'overdue').length;
      return bOverdue - aOverdue;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedExecs.map(exec => {
        const execTasks = grouped.get(exec.id) || [];
        const overdueCount = execTasks.filter(t => categorize(t) === 'overdue').length;

        return (
          <div key={exec.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Associate header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {exec.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{exec.name}</p>
                <p className="text-[11px] text-gray-400">{execTasks.length} task{execTasks.length !== 1 ? 's' : ''}</p>
              </div>
              {overdueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {overdueCount} overdue
                </span>
              )}
            </div>

            {/* Task cards */}
            <div className="p-3 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {execTasks
                .sort((a, b) => {
                  const order = { overdue: 0, today: 1, upcoming: 2, completed: 3 };
                  return order[categorize(a)] - order[categorize(b)];
                })
                .map(task => {
                  const cat = categorize(task);
                  const badge = statusBadge[cat];
                  const BadgeIcon = badge.icon;
                  const taskDate = task.date ? new Date(task.date) : null;

                  return (
                    <div
                      key={task.id}
                      className={`border-l-[3px] ${statusBorder[cat]} rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow ${cat === 'completed' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{task.schoolName || '—'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              task.type === 'seminar' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {task.type === 'seminar' ? 'Seminar' : 'Follow-up'}
                            </span>
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.cls}`}>
                              <BadgeIcon size={10} />
                              {badge.label}
                            </span>
                          </div>
                        </div>
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
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{taskDate ? format(taskDate, 'dd MMM yyyy') : 'No date'}</span>
                        <span>{task.assignedBy === 'Self' ? 'Self-created' : task.assignedBy || 'Manager'}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
