import { useState, useMemo } from 'react';
import { useTaskCenter } from '../hooks/useTaskCenter';
import { TaskFilters, type StatusFilter, type TypeFilter, type AssignedByFilter } from '../components/tasks/TaskFilters';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskCardView } from '../components/tasks/TaskCardView';
import { TaskCalendarView } from '../components/tasks/TaskCalendarView';
import { List, LayoutGrid, Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarPickerIcon } from 'lucide-react';


type ViewMode = 'list' | 'cards' | 'calendar';

export default function TaskCenter({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const {
    tasks, isLoading, executives, users,
    categorizeSingle,
    snoozeTask, postponeTask, pushToToday, completeTask, deleteTask, assignTask,
  } = useTaskCenter();
  const { toast } = useToast();

  // View toggle
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [assignedByFilter, setAssignedByFilter] = useState<AssignedByFilter>('all');
  const [associateFilter, setAssociateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ executiveId: '', schoolName: '', type: 'follow-up' as 'seminar' | 'follow-up', date: new Date(), notes: '' });
  const [isAssigning, setIsAssigning] = useState(false);

  // Counts for filter badges
  const counts = useMemo(() => {
    const c = { overdue: 0, today: 0, upcoming: 0, completed: 0, total: tasks.length };
    tasks.forEach(t => { c[categorizeSingle(t)]++; });
    return c;
  }, [tasks, categorizeSingle]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'all' && categorizeSingle(t) !== statusFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (assignedByFilter !== 'all') {
        if (assignedByFilter === 'Self' && t.assignedBy !== 'Self') return false;
        if (assignedByFilter === 'Manager' && t.assignedBy === 'Self') return false;
      }
      if (associateFilter !== 'all' && t.executiveId !== associateFilter) return false;
      if (searchQuery && !(t.schoolName || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, statusFilter, typeFilter, assignedByFilter, associateFilter, searchQuery, categorizeSingle]);

  // Wrapped actions with toast feedback
  const handleSnooze = async (taskId: string, date: Date) => {
    try { await snoozeTask(taskId, date); toast({ title: 'Task snoozed', description: `Snoozed until ${format(date, 'dd MMM')}` }); }
    catch { toast({ title: 'Error', description: 'Failed to snooze task', variant: 'destructive' }); }
  };
  const handlePostpone = async (taskId: string, date: Date) => {
    try { await postponeTask(taskId, date); toast({ title: 'Task rescheduled', description: `Moved to ${format(date, 'dd MMM')}` }); }
    catch { toast({ title: 'Error', description: 'Failed to reschedule', variant: 'destructive' }); }
  };
  const handlePushToToday = async (taskId: string) => {
    try { await pushToToday(taskId); toast({ title: 'Pushed to today', description: 'Task moved to today' }); }
    catch { toast({ title: 'Error', description: 'Failed to push task', variant: 'destructive' }); }
  };
  const handleComplete = async (taskId: string) => {
    try { await completeTask(taskId); toast({ title: 'Task completed' }); }
    catch { toast({ title: 'Error', description: 'Failed to complete', variant: 'destructive' }); }
  };
  const handleDelete = async (taskId: string) => {
    try { await deleteTask(taskId); toast({ title: 'Task deleted' }); }
    catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.executiveId || !assignForm.schoolName.trim()) return;
    setIsAssigning(true);
    try {
      await assignTask(assignForm.executiveId, assignForm.schoolName, assignForm.type, assignForm.date, assignForm.notes);
      toast({ title: 'Task assigned' });
      setShowAssign(false);
      setAssignForm({ executiveId: '', schoolName: '', type: 'follow-up', date: new Date(), notes: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to assign task', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const viewOptions: { key: ViewMode; icon: typeof List; label: string }[] = [
    { key: 'list', icon: List, label: 'List' },
    { key: 'cards', icon: LayoutGrid, label: 'Cards' },
    { key: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isEmbedded ? 'p-8' : ''}`}>
      {/* Page header */}
      <div className={`flex items-center mb-6 shrink-0 ${isEmbedded ? 'justify-end' : 'justify-between'}`}>
        {!isEmbedded && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Center</h1>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {viewOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => setViewMode(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === opt.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Assign Task button */}
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Assign Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 shrink-0">
        <TaskFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          assignedByFilter={assignedByFilter}
          setAssignedByFilter={setAssignedByFilter}
          associateFilter={associateFilter}
          setAssociateFilter={setAssociateFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          executives={executives}
          counts={counts}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {viewMode === 'list' && (
          <TaskListView
            tasks={filteredTasks}
            users={users}
            categorize={categorizeSingle}
            onSnooze={handleSnooze}
            onPostpone={handlePostpone}
            onPushToToday={handlePushToToday}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        )}
        {viewMode === 'cards' && (
          <TaskCardView
            tasks={filteredTasks}
            users={users}
            executives={executives}
            categorize={categorizeSingle}
            onSnooze={handleSnooze}
            onPostpone={handlePostpone}
            onPushToToday={handlePushToToday}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        )}
        {viewMode === 'calendar' && (
          <TaskCalendarView
            tasks={filteredTasks}
            users={users}
            categorize={categorizeSingle}
            onSnooze={handleSnooze}
            onPostpone={handlePostpone}
            onPushToToday={handlePushToToday}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ─── Assign Task Modal ───────────────────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-1">Assign Task</h2>
            <p className="text-sm text-gray-500 mb-6">Create a new task for any associate</p>

            <form onSubmit={handleAssign} className="space-y-4">
              {/* Associate picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Associate</label>
                <select
                  required
                  value={assignForm.executiveId}
                  onChange={e => setAssignForm({ ...assignForm, executiveId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Select associate...</option>
                  {executives.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* School name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={assignForm.schoolName}
                  onChange={e => setAssignForm({ ...assignForm, schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. XYZ Public School"
                />
              </div>

              {/* Type toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, type: 'follow-up' })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      assignForm.type === 'follow-up'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, type: 'seminar' })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      assignForm.type === 'seminar'
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Seminar
                  </button>
                </div>
              </div>

              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Popover>
                  <PopoverTrigger className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-gray-900 hover:bg-gray-50 transition-colors">
                    <span className="text-gray-900">{format(assignForm.date, 'PPP')}</span>
                    <CalendarPickerIcon className="h-4 w-4 text-gray-500" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <Calendar
                      mode="single"
                      selected={assignForm.date}
                      onSelect={(date) => date && setAssignForm({ ...assignForm, date })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Ask about lab setup"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssign(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
