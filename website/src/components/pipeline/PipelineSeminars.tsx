import { useMemo, useState } from 'react';
import {  User, Clock } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { type SchoolPipelineEntry } from './types';
import { useAuthStore } from '../../stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useToast } from '../../hooks/use-toast';

interface PipelineSeminarsProps {
  pipelineData: SchoolPipelineEntry[];
  setSelectedSchool: (school: SchoolPipelineEntry) => void;
  searchQuery: string;
  dateFilter: string;
  associateFilter: string;
  taskTypeFilter: string;
  setAssociateFilter: (val: string) => void;
  setTaskTypeFilter: (val: string) => void;
}

export function PipelineSeminars({
  pipelineData,
  setSelectedSchool,
  searchQuery,
  dateFilter,
  associateFilter,
  taskTypeFilter,
  setAssociateFilter,
  setTaskTypeFilter
}: PipelineSeminarsProps) {
  const { users } = useAuthStore();
  const { toast } = useToast();

  const [assigningTask, setAssigningTask] = useState<{ school: SchoolPipelineEntry, type: 'seminar' | 'follow_up' } | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const tasks = useMemo(() => {
    const list: any[] = [];
    pipelineData.forEach(s => {
      // Prioritize seminar over follow up, ensuring only 1 task per lead
      if (s.seminarDate) {
        list.push({ ...s, taskType: 'seminar', taskDate: s.seminarDate });
      } else if (s.followUpDate) {
        list.push({ ...s, taskType: 'follow_up', taskDate: s.followUpDate });
      }
    });
    return list.sort((a, b) => new Date(a.taskDate).getTime() - new Date(b.taskDate).getTime());
  }, [pipelineData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (taskTypeFilter !== 'all' && t.taskType !== taskTypeFilter) return false;
      if (associateFilter !== 'all' && t.executiveEmail !== associateFilter) return false;
      if (dateFilter) {
        const tDate = t.taskDate ? new Date(t.taskDate).toISOString().split('T')[0] : '';
        if (tDate !== dateFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.schoolName.toLowerCase().includes(q) && !t.executiveName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, taskTypeFilter, associateFilter, dateFilter, searchQuery]);

  // Calculate associate stats based on ALL tasks (before filtering) so numbers are stable
  const associateStats = useMemo(() => {
    const stats: Record<string, { count: number, name: string }> = {};
    tasks.forEach(s => {
      const key = s.executiveEmail || s.executiveName || 'Unknown';
      if (!stats[key]) {
        stats[key] = { count: 0, name: s.executiveName || 'Unknown' };
      }
      stats[key].count++;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [tasks]);

  const executives = useMemo(() => {
    return Object.values(users).filter(u => u.role === 'executive');
  }, [users]);

  const handleAssignTask = async () => {
    if (!assigningTask || !selectedExecutiveId) return;
    setIsAssigning(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        type: assigningTask.type,
        schoolName: assigningTask.school.schoolName,
        lsqLeadId: assigningTask.school.lsqLeadId,
        date: assigningTask.type === 'seminar' ? assigningTask.school.seminarDate : assigningTask.school.followUpDate,
        executiveId: selectedExecutiveId,
        assignedBy: useAuthStore.getState().user?.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast({ title: 'Task Assigned', description: `Successfully assigned to associate.` });
      setAssigningTask(null);
      setSelectedExecutiveId('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Assignment Failed', description: 'Could not assign task.', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="w-full shrink-0 flex flex-col h-full p-8 md:p-10 max-w-7xl mx-auto">

      <ScrollArea className="flex-1 min-h-0 -mx-4 px-4">
        <div className="pb-12 space-y-10">

          {/* Quick Filters */}
          <div className="flex flex-col gap-6">
            {/* Task Type Filters */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Task Type</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setTaskTypeFilter('all')}
                  className={`flex items-center gap-2 transition-colors rounded-full px-4 py-1.5 font-medium text-sm ${taskTypeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  All Tasks
                </button>
                <button
                  onClick={() => setTaskTypeFilter('seminar')}
                  className={`flex items-center gap-2 transition-colors rounded-full px-4 py-1.5 font-medium text-sm ${taskTypeFilter === 'seminar' ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${taskTypeFilter === 'seminar' ? 'bg-white' : 'bg-purple-500'}`} />
                  Seminars
                </button>
                <button
                  onClick={() => setTaskTypeFilter('follow_up')}
                  className={`flex items-center gap-2 transition-colors rounded-full px-4 py-1.5 font-medium text-sm ${taskTypeFilter === 'follow_up' ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${taskTypeFilter === 'follow_up' ? 'bg-white' : 'bg-blue-500'}`} />
                  Follow-ups
                </button>
              </div>
            </div>

            {/* Associate Counter Section */}
            {associateStats.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Tasks by Associate</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setAssociateFilter('all')}
                    className={`flex items-center gap-2 transition-colors rounded-full px-4 py-1.5 font-medium text-sm ${associateFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    All Associates
                  </button>
                  {associateStats.map(stat => {
                    // Check if this stat matches the currently filtered associate email
                    const isSelected = associateFilter !== 'all' && associateFilter === (tasks.find(t => t.executiveName === stat.name)?.executiveEmail || '');
                    return (
                      <button
                        key={stat.name}
                        onClick={() => {
                          const email = tasks.find(t => t.executiveName === stat.name)?.executiveEmail || '';
                          setAssociateFilter(email);
                        }}
                        className={`flex items-center gap-2 transition-colors rounded-full px-4 py-1.5 ${isSelected ? 'bg-gray-900 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                      >
                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>{stat.name}</span>
                        <span className={`text-xs font-semibold ml-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>{stat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tasks Grid */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTasks.map((task, i) => (
                <div
                  key={task.schoolName + i}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-5 group relative cursor-pointer"
                  onClick={() => setSelectedSchool(task)}
                >
                  <div className="flex justify-between items-start w-full gap-4">
                    <h3 className="font-semibold text-lg text-gray-900 leading-snug line-clamp-2">{task.schoolName}</h3>

                    {/* Dot Badge */}
                    <div className="flex items-center gap-1.5 mt-1 shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${task.taskType === 'seminar' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                      <span className="text-xs font-medium text-gray-500">
                        {task.taskType === 'seminar' ? 'Seminar' : 'Follow-up'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-500 font-medium">
                    <Clock size={14} className="mr-2" />
                    {new Date(task.taskDate).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center justify-between w-full mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600 font-medium">{task.executiveName}</span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setAssigningTask({ school: task, type: task.taskType }); }}
                      className="text-sm font-semibold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      Assign <span className="text-lg leading-none">&rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <p className="text-gray-400 font-medium text-lg">No upcoming tasks match your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={!!assigningTask} onOpenChange={(open) => !open && setAssigningTask(null)}>
        <DialogContent className="border-gray-100 shadow-xl rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight text-gray-900">Assign Task</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-gray-500 mb-6 font-medium">
              Assigning {assigningTask?.type === 'seminar' ? 'Seminar' : 'Follow-up'} at <span className="text-gray-900 font-semibold">{assigningTask?.school.schoolName}</span>
            </p>
            <select
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              className="w-full p-3 border border-gray-200 hover:border-gray-300 rounded-xl bg-white text-gray-900 text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-gray-100"
            >
              <option value="">Select Associate...</option>
              {executives.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAssigningTask(null)} className="rounded-xl font-semibold hover:bg-gray-100">Cancel</Button>
            <Button onClick={handleAssignTask} disabled={!selectedExecutiveId || isAssigning} className="rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white">
              {isAssigning ? 'Assigning...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
