
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AssociateTasksProps {
  tasks: any[];
}

export function AssociateTasks({ tasks }: AssociateTasksProps) {
  // Sort tasks: pending first, then by date, completed at the bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return aDate - bDate;
  });

  return (
    <div className="bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden flex flex-col h-full min-h-[350px]">
      <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <h3 className="font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
          Assigned Tasks
        </h3>
        <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {tasks.filter(t => !t.completed).length} Pending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sortedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <CheckCircle2 size={32} className="mb-3 opacity-20" />
            <p className="text-sm">No tasks assigned</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedTasks.map((task) => (
              <div 
                key={task.id} 
                className={`flex gap-4 p-3 rounded-xl transition-colors ${
                  task.completed ? 'opacity-60 bg-zinc-50' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="mt-0.5">
                  {task.completed ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                    <Circle size={18} className="text-zinc-300" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>
                    {task.title || 'Untitled Task'}
                  </p>
                  
                  {task.schoolName && (
                    <p className="text-xs text-zinc-500 mt-1 truncate flex items-center gap-1.5">
                      🏫 {task.schoolName}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                      <Clock size={12} />
                      {task.date ? format(new Date(task.date), "MMM d, h:mm a") : 'No date'}
                    </span>
                    
                    {task.completedAt && (
                      <span className="text-[11px] font-medium text-green-600/70">
                        Completed {format(new Date(task.completedAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
