import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { ScrollArea } from '../components/ui/scroll-area';
import { Input } from '../components/ui/input';
import { Search, Building2, User, Phone, ChevronRight, FileText } from 'lucide-react';

const STAGES = [
  { key: 'Refused Entry - RE', short: 'RE', label: 'Refused Entry', color: 'bg-red-500', lightColor: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
  { key: 'Front Desk Interaction - FDI', short: 'FDI', label: 'Front Desk', color: 'bg-amber-500', lightColor: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
  { key: 'PIC Interaction - PCI', short: 'PCI', label: 'PIC Interaction', color: 'bg-blue-500', lightColor: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
  { key: 'Principal Interaction - PI', short: 'PI', label: 'Principal', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
];

function getStageIndex(walkInStatus: string): number {
  if (!walkInStatus) return -1;
  return STAGES.findIndex(s => walkInStatus.includes(s.short) || walkInStatus.includes(s.key));
}

interface SchoolPipelineEntry {
  schoolName: string;
  lsqLeadId: string;
  latestActivity: any;
  stageIndex: number;
  visitCount: number;
  lastVisitDate: string;
  executiveName: string;
  executiveEmail: string;
}

export default function Pipeline() {
  const { user, users } = useAuthStore();
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolPipelineEntry | null>(null);
  const [schoolActivities, setSchoolActivities] = useState<any[]>([]);

  // Fetch all CRM activities for the team
  useEffect(() => {
    if (!user) return;
    
    // Get team member IDs
    const teamIds = Object.values(users)
      .filter(u => user.role === 'admin' || u.managerId === user.id)
      .map(u => u.email?.toLowerCase())
      .filter(Boolean);

    if (teamIds.length === 0) return;

    const q = query(
      collection(db, 'crmActivities'),
      where('executiveEmail', 'in', teamIds.slice(0, 30)), // Firestore 'in' limit is 30
      orderBy('lsqCreatedOn', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCrmActivities(activities);
    });

    return () => unsub();
  }, [user, users]);

  // Aggregate activities into pipeline entries (one per school, latest activity wins)
  const pipelineData = useMemo(() => {
    const schoolMap: Record<string, SchoolPipelineEntry> = {};

    crmActivities.forEach(act => {
      const key = act.schoolName || act.lsqLeadId || 'unknown';
      const stageIdx = getStageIndex(act.walkInStatus || '');
      const assocUser = Object.values(users).find(u => u.email?.toLowerCase() === act.executiveEmail);

      if (!schoolMap[key]) {
        schoolMap[key] = {
          schoolName: act.schoolName || 'Unknown School',
          lsqLeadId: act.lsqLeadId || '',
          latestActivity: act,
          stageIndex: stageIdx,
          visitCount: 1,
          lastVisitDate: act.walkInDateTime || act.lsqCreatedOn || '',
          executiveName: assocUser?.name || act.executiveEmail || '',
          executiveEmail: act.executiveEmail || '',
        };
      } else {
        schoolMap[key].visitCount++;
        // Keep the latest / highest stage
        const existing = schoolMap[key];
        const existingDate = new Date(existing.lastVisitDate).getTime() || 0;
        const newDate = new Date(act.walkInDateTime || act.lsqCreatedOn || '').getTime() || 0;
        if (newDate > existingDate) {
          schoolMap[key].latestActivity = act;
          schoolMap[key].stageIndex = stageIdx;
          schoolMap[key].lastVisitDate = act.walkInDateTime || act.lsqCreatedOn || '';
          schoolMap[key].executiveName = assocUser?.name || act.executiveEmail || '';
          schoolMap[key].executiveEmail = act.executiveEmail || '';
        }
      }
    });

    return Object.values(schoolMap);
  }, [crmActivities, users]);

  // Group by stage
  const stageGroups = useMemo(() => {
    const groups: Record<number, SchoolPipelineEntry[]> = { [-1]: [], 0: [], 1: [], 2: [], 3: [] };
    
    pipelineData
      .filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.schoolName.toLowerCase().includes(q) || s.executiveName.toLowerCase().includes(q);
      })
      .forEach(s => {
        const idx = s.stageIndex >= 0 ? s.stageIndex : -1;
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(s);
      });

    return groups;
  }, [pipelineData, searchQuery]);

  // Load all activities for a selected school
  useEffect(() => {
    if (!selectedSchool) {
      setSchoolActivities([]);
      return;
    }
    const matching = crmActivities
      .filter(a => (a.schoolName || a.lsqLeadId) === (selectedSchool.schoolName || selectedSchool.lsqLeadId))
      .sort((a, b) => {
        const da = new Date(a.walkInDateTime || a.lsqCreatedOn || '').getTime() || 0;
        const db2 = new Date(b.walkInDateTime || b.lsqCreatedOn || '').getTime() || 0;
        return db2 - da;
      });
    setSchoolActivities(matching);
  }, [selectedSchool, crmActivities]);

  return (
    <div className="flex h-[calc(100vh-48px)] gap-6 p-6 bg-[#fafafa] text-zinc-900 animate-in fade-in duration-700">
      
      {/* MAIN PIPELINE VIEW */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all ${selectedSchool ? 'w-[60%]' : 'w-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-zinc-200 rounded-xl shadow-sm">
              <Building2 className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">School Pipeline</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{pipelineData.length} schools tracked</p>
            </div>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search schools or associates..." 
              className="pl-10 rounded-xl border-zinc-200 bg-white h-11 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stage count strip */}
        <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
          {STAGES.map((stage, i) => (
            <div key={stage.short} className={`p-4 rounded-xl border ${stage.lightColor} transition-all hover:shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
              </div>
              <p className="text-3xl font-light text-zinc-900 mt-2 tracking-tight">{stageGroups[i]?.length || 0}</p>
            </div>
          ))}
        </div>

        {/* Kanban-style columns */}
        <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
          {STAGES.map((stage, i) => (
            <div key={stage.short} className="flex flex-col h-full overflow-hidden">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${stage.color}`}>
                <span className="text-white text-xs font-bold uppercase tracking-wider">{stage.label}</span>
                <span className="text-white/70 text-xs font-bold ml-auto">{stageGroups[i]?.length || 0}</span>
              </div>
              <ScrollArea className="flex-1 bg-white border border-t-0 border-zinc-200 rounded-b-xl">
                <div className="p-2 space-y-2">
                  {(stageGroups[i] || []).map(school => {
                    const isSelected = selectedSchool?.schoolName === school.schoolName;
                    return (
                      <button
                        key={school.schoolName}
                        onClick={() => setSelectedSchool(isSelected ? null : school)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}
                      >
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{school.schoolName}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {school.executiveName}
                          </span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {school.visitCount} visit{school.visitCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {school.lastVisitDate && (
                          <p className={`text-[10px] mt-1 ${isSelected ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Last: {new Date(school.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {(!stageGroups[i] || stageGroups[i].length === 0) && (
                    <div className="py-8 text-center text-zinc-400 text-sm">No schools</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — School Detail */}
      {selectedSchool && (
        <div className="w-[380px] flex flex-col h-full bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
          
          {/* Header */}
          <div className="p-6 bg-zinc-900 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate tracking-tight">{selectedSchool.schoolName}</h3>
                <p className="text-zinc-400 text-sm mt-1">{selectedSchool.executiveName}</p>
              </div>
              <button 
                onClick={() => setSelectedSchool(null)} 
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                selectedSchool.stageIndex >= 0 ? `${STAGES[selectedSchool.stageIndex].lightColor} ${STAGES[selectedSchool.stageIndex].textColor}` : 'bg-zinc-800 text-zinc-400'
              }`}>
                {selectedSchool.stageIndex >= 0 ? STAGES[selectedSchool.stageIndex].label : 'Unknown'}
              </span>
              <span className="text-zinc-500 text-[11px]">{selectedSchool.visitCount} visits total</span>
            </div>
          </div>

          {/* Quick info from latest activity */}
          {selectedSchool.latestActivity && (
            <div className="p-4 border-b border-zinc-100 grid grid-cols-2 gap-3">
              {selectedSchool.latestActivity.boardOfSchool && (
                <div className="text-center p-2 bg-zinc-50 rounded-lg">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Board</p>
                  <p className="text-sm font-medium text-zinc-900 mt-1">{selectedSchool.latestActivity.boardOfSchool}</p>
                </div>
              )}
              {selectedSchool.latestActivity.studentStrength && (
                <div className="text-center p-2 bg-zinc-50 rounded-lg">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Strength</p>
                  <p className="text-sm font-medium text-zinc-900 mt-1">{selectedSchool.latestActivity.studentStrength}</p>
                </div>
              )}
              {(selectedSchool.latestActivity.principalName || selectedSchool.latestActivity.picName) && (
                <div className="col-span-2 p-2 bg-zinc-50 rounded-lg">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Contact</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User size={12} className="text-zinc-500" />
                    <p className="text-sm font-medium text-zinc-900">{selectedSchool.latestActivity.principalName || selectedSchool.latestActivity.picName}</p>
                  </div>
                  {(selectedSchool.latestActivity.principalPhone || selectedSchool.latestActivity.picPhone) && (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone size={12} className="text-zinc-500" />
                      <p className="text-sm text-zinc-600">{selectedSchool.latestActivity.principalPhone || selectedSchool.latestActivity.picPhone}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity History */}
          <div className="p-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Activity History</p>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="space-y-3">
              {schoolActivities.map((act, idx) => {
                const stageIdx = getStageIndex(act.walkInStatus || '');
                const date = act.walkInDateTime || act.lsqCreatedOn;
                return (
                  <div key={act.id || idx} className="relative pl-6 border-l-2 border-zinc-200 pb-3 last:pb-0">
                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white ${stageIdx >= 0 ? `border-${STAGES[stageIdx].color.replace('bg-', '')}` : 'border-zinc-300'}`} 
                         style={{ borderColor: stageIdx === 0 ? '#ef4444' : stageIdx === 1 ? '#f59e0b' : stageIdx === 2 ? '#3b82f6' : stageIdx === 3 ? '#10b981' : '#d4d4d8' }} />
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {act.typeOfWalkIn || act.activityType || 'Visit'}
                          {act.walkInStatus && <span className="text-zinc-500"> — {STAGES[stageIdx]?.label || act.walkInStatus}</span>}
                        </p>
                        {/* Outcome */}
                        {stageIdx === 0 && act.refusedEntryReason && <p className="text-xs text-zinc-500 mt-0.5">{act.refusedEntryReason}</p>}
                        {stageIdx === 1 && act.statusFrontDesk && <p className="text-xs text-zinc-500 mt-0.5">{act.statusFrontDesk}</p>}
                        {stageIdx === 2 && act.statusPIC && <p className="text-xs text-zinc-500 mt-0.5">{act.statusPIC}</p>}
                        {stageIdx === 3 && act.statusPrincipal && <p className="text-xs text-zinc-500 mt-0.5">{act.statusPrincipal}</p>}
                        {act.notes && (
                          <p className="text-xs text-zinc-500 mt-1 flex items-start gap-1">
                            <FileText size={10} className="mt-0.5 shrink-0" /> {act.notes.substring(0, 120)}{act.notes.length > 120 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {date && (
                      <p className="text-[10px] text-zinc-400 font-medium mt-1">
                        {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                );
              })}
              {schoolActivities.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-sm">No activity history yet.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
