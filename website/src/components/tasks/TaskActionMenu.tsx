import { useState } from 'react';
import {  Clock, ArrowRight, Check, Trash2, MoreHorizontal, Pause } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarPicker } from '../ui/calendar';
import type { Task } from '@kalvium-outreach/shared';

interface TaskActionMenuProps {
  task: Task;
  category: 'overdue' | 'today' | 'upcoming' | 'completed';
  onSnooze: (taskId: string, date: Date) => void;
  onPostpone: (taskId: string, date: Date) => void;
  onPushToToday: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskActionMenu({ task, category, onSnooze, onPostpone, onPushToToday, onComplete, onDelete }: TaskActionMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<'none' | 'snooze' | 'postpone'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset submenu when closing
  const handleOpenChange = (open: boolean) => {
    setMenuOpen(open);
    if (!open) {
      setTimeout(() => {
        setActiveSubMenu('none');
        setConfirmDelete(false);
      }, 200);
    }
  };

  if (category === 'completed') {
    return (
      <button
        onClick={() => { if (confirmDelete) { onDelete(task.id); setConfirmDelete(false); } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); } }}
        className={`p-1.5 rounded-lg transition-colors ${confirmDelete ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
        title={confirmDelete ? 'Click again to confirm' : 'Delete'}
      >
        <Trash2 size={16} />
      </button>
    );
  }

  return (
    <Popover open={menuOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center">
        <MoreHorizontal size={16} />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 z-[60]" align="end">
        {activeSubMenu === 'none' ? (
          <div className="flex flex-col">
            {category === 'overdue' && (
              <button
                onClick={() => { onPushToToday(task.id); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-colors text-left"
              >
                <ArrowRight size={14} />
                Push to Today
              </button>
            )}

            <button
              onClick={() => setActiveSubMenu('snooze')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
            >
              <Pause size={14} className="text-blue-500" />
              Snooze
            </button>

            <button
              onClick={() => setActiveSubMenu('postpone')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
            >
              <Clock size={14} className="text-purple-500" />
              Reschedule
            </button>

            <div className="h-px bg-gray-100 my-1 mx-2" />

            <button
              onClick={() => { onComplete(task.id); setMenuOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
            >
              <Check size={14} className="text-emerald-500" />
              Mark Complete
            </button>

            <button
              onClick={() => { if (confirmDelete) { onDelete(task.id); setMenuOpen(false); } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); } }}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${confirmDelete ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Trash2 size={14} className={confirmDelete ? 'text-red-500' : 'text-red-400'} />
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-gray-100">
              <button
                onClick={() => setActiveSubMenu('none')}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ArrowRight size={14} className="rotate-180" />
              </button>
              <p className="text-xs font-semibold text-gray-700">
                {activeSubMenu === 'snooze' ? 'Snooze until' : 'Reschedule to'}
              </p>
            </div>
            <div className="p-2 flex justify-center">
              <CalendarPicker
                mode="single"
                selected={undefined}
                onSelect={(date) => {
                  if (date) {
                    if (activeSubMenu === 'snooze') onSnooze(task.id, date);
                    else onPostpone(task.id, date);
                    setMenuOpen(false);
                  }
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
