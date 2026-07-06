import { useMemo, useState } from 'react';
import { Calendar, User, Clock } from 'lucide-react';
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
}

export function PipelineSeminars({ 
  pipelineData, 
  setSelectedSchool,
  searchQuery,
  dateFilter,
  associateFilter,
  taskTypeFilter
}: PipelineSeminarsProps) {
  const { users } = useAuthStore();
  const { toast } = useToast();
  
  const [assigningTask, setAssigningTask] = useState<{school: SchoolPipelineEntry, type: 'seminar'|'follow_up'} | null>(null);
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
    <div className="w-full shrink-0 snap-center flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <Calendar className="w-5 h-5 text-zinc-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Upcoming Tasks</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{filteredTasks.length} tasks scheduled</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="pb-12 space-y-8">
          
          {/* Associate Counter Section */}
          {associateStats.length > 0 && (
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Tasks by Associate</h2>
              <div className="flex flex-wrap gap-2">
                {associateStats.map(stat => (
                  <div key={stat.name} className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <User size={12} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700">{stat.name}</span>
                    <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Grid */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTasks.map((task, i) => (
                <div key={task.schoolName + i} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group relative cursor-pointer" onClick={() => setSelectedSchool(task)}>
                  <div className="flex justify-between items-start w-full gap-3">
                    <h3 className="font-semibold text-zinc-900 line-clamp-2">{task.schoolName}</h3>
                    <span className={`px-2 py-1 border rounded-md text-[10px] font-bold whitespace-nowrap ${task.taskType === 'seminar' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {task.taskType === 'seminar' ? 'Seminar' : 'Follow-up'}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-xs text-zinc-500 font-medium">
                    <Clock size={12} className="mr-1.5" />
                    {new Date(task.taskDate).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center justify-between w-full mt-2 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-600 font-medium">{task.executiveName}</span>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setAssigningTask({school: task, type: task.taskType}); }}
                      className="text-[10px] font-bold uppercase tracking-wide text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Calendar className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No upcoming tasks match your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={!!assigningTask} onOpenChange={(open) => !open && setAssigningTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to Associate</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-500 mb-4">
              Assigning {assigningTask?.type === 'seminar' ? 'Seminar' : 'Follow-up'} at <strong>{assigningTask?.school.schoolName}</strong>
            </p>
            <select 
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-md bg-white text-sm"
            >
              <option value="">Select Associate...</option>
              {executives.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningTask(null)}>Cancel</Button>
            <Button onClick={handleAssignTask} disabled={!selectedExecutiveId || isAssigning}>
              {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
