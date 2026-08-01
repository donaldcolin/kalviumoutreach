import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';

import { type SchoolPipelineEntry, getStageIndex } from '../components/pipeline/types';
import { PipelineBoard } from '../components/pipeline/PipelineBoard';
import { SchoolDetailSheet } from '../components/pipeline/SchoolDetailSheet';
import TaskCenter from './TaskCenter';
import { GlobalDataFilter } from '../components/GlobalDataFilter';
import { Building2, KanbanSquare, ListTodo, Calendar, ExternalLink } from 'lucide-react';

import { EmptyState } from '../components/ui/EmptyState';

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('refuse') || s.includes('deny') || s.includes('reject') || s.includes('not interested')) return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('api') || s.includes('meeting') || s.includes('success') || s.includes('positive')) return 'bg-green-50 text-green-700 border-green-200';
  if (s.includes('follow up') || s.includes('call') || s.includes('schedule')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('interest')) return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

const cleanStatusLabel = (status: string) => {
  if (!status) return 'Update';
  return status.replace(/\s*-\s*[A-Z]+$/, '');
};

type ViewMode = 'board' | 'tasks' | 'list';
type SortConfig = { key: keyof SchoolPipelineEntry; direction: 'asc' | 'desc' } | null;

export default function CRMHub() {
  const { user, users } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Shared Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'seminar' | 'follow_up'>('all');

  // Data State
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [apiLeads, setApiLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolPipelineEntry | null>(null);

  // Table State
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Compute available managers based on RBAC
  const availableManagers = useMemo(() => {
    if (!user) return [];
    const allUsers = Object.values(users);
    if (user.role === 'admin') return allUsers.filter(u => u.role === 'teamLead');
    if (user.role === 'regionalManager') return allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id);
    return [];
  }, [user, users]);

  const allUsers = useMemo(() => Object.values(users), [users]);
  
  // Compute visible executives based on filters
  const visibleExecutives = useMemo(() => {
    if (!user) return [];
    let executives: any[] = [];
    
    if (user.role === 'admin' || user.role === 'regionalManager') {
      if (managerFilter !== 'all') {
        executives = allUsers.filter(u => u.role === 'executive' && u.managerId === managerFilter);
      } else {
        if (user.role === 'admin') {
          executives = allUsers.filter(u => u.role === 'executive');
        } else {
          const myManagerIds = new Set(availableManagers.map(m => m.id));
          executives = allUsers.filter(u => u.role === 'executive' && u.managerId && myManagerIds.has(u.managerId));
        }
      }
    } else if (user.role === 'teamLead') {
      executives = allUsers.filter(u => u.managerId === user.id);
    }
    return executives;
  }, [user, allUsers, managerFilter, availableManagers]);

  // If a specific associate is chosen, filter down to just them
  const targetTeamIds = useMemo(() => {
    let list = visibleExecutives;
    if (associateFilter !== 'all') {
      list = visibleExecutives.filter(e => e.email === associateFilter);
    }
    return list.map(u => u.email?.toLowerCase()).filter(Boolean) as string[];
  }, [visibleExecutives, associateFilter]);

  // 1. Fetch CRM Activities for target team
  useEffect(() => {
    if (targetTeamIds.length === 0) {
      setCrmActivities([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    let allActivities: any[] = [];
    
    // Firestore IN queries are limited to 30 items. We split into chunks if needed.
    const chunks = [];
    for (let i = 0; i < targetTeamIds.length; i += 30) {
      chunks.push(targetTeamIds.slice(i, i + 30));
    }

    chunks.forEach((chunk) => {
      const q = query(
        collection(db, 'crmActivities'),
        where('executiveEmail', 'in', chunk)
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Merge activities from different chunks
        allActivities = [...allActivities.filter(a => !chunk.includes(a.executiveEmail?.toLowerCase())), ...activities];
        
        // Sort
        allActivities.sort((a, b) => {
          const da = new Date(a.lsqCreatedOn || 0).getTime();
          const db2 = new Date(b.lsqCreatedOn || 0).getTime();
          return db2 - da;
        });
        
        setCrmActivities([...allActivities]);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [targetTeamIds]);

  // 2. Fetch leads from LeadSquared API (to populate schools with no activities yet)
  useEffect(() => {
    if (targetTeamIds.length === 0) {
      setApiLeads([]);
      return;
    }

    setIsLoadingLeads(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';
    
    // To avoid hitting API too heavily if there are many executives, we only fetch 
    // if there is a specific associate selected, OR if the list is small enough.
    // For large teams, we'll just rely on CRM activities unless filtered.
    if (targetTeamIds.length > 5 && associateFilter === 'all') {
      // Too many to fetch individually, rely on CRM activities
      setApiLeads([]);
      setIsLoadingLeads(false);
      return;
    }

    Promise.all(targetTeamIds.map(email => 
      fetch(`${API_BASE_URL}/api/leads?email=${encodeURIComponent(email)}`)
        .then(res => res.json())
        .then(res => ({ ...res, email }))
        .catch(() => ({ success: false, leads: [], email }))
    )).then(results => {
      let combinedLeads: any[] = [];
      results.forEach(res => {
        if (res.success && Array.isArray(res.leads)) {
          const leadsWithEmail = res.leads.map(l => ({
            ...l,
            OwnerEmailAddress: l.OwnerEmailAddress || l.OwnerEmail || res.email
          }));
          combinedLeads = [...combinedLeads, ...leadsWithEmail];
        }
      });
      setApiLeads(combinedLeads);
      setIsLoadingLeads(false);
    });
  }, [targetTeamIds, associateFilter]);

  // 3. Aggregate everything  // Computed Derived Data
  const pipelineData = useMemo(() => {
    // 1. Create a map of CRM Activities (indexed by school name or lsqLeadId)
    const schoolMap: Record<string, SchoolPipelineEntry> = {};

    // First populate from API leads
    apiLeads.forEach(lead => {
      if (lead.ProspectStage !== 'School Prospect') return;
      
      const schoolName = lead.Company || [lead.FirstName, lead.LastName].filter(Boolean).join(' ') || 'Unknown School';
      const leadId = lead.ProspectID || '';
      if (!leadId) return;
      
      const ownerEmail = lead.OwnerEmailAddress || lead.OwnerEmail;
      const assocUser = Object.values(users).find(u => u.email?.toLowerCase() === ownerEmail?.toLowerCase());
      
      schoolMap[schoolName || leadId] = {
        schoolName: schoolName,
        lsqLeadId: leadId,
        latestActivity: null,
        stageIndex: getStageIndex('School Prospect'),
        visitCount: 0,
        lastVisitDate: '',
        executiveName: assocUser?.name || ownerEmail || 'Unknown',
        executiveEmail: ownerEmail || '',
        prospectStage: lead.ProspectStage || '',
        source: lead.Source || '',
        modifiedOn: lead.ModifiedOn || ''
      };
    });

    // Then override/update with actual CRM Activities
    crmActivities.forEach(act => {
      const key = act.schoolName || act.lsqLeadId || 'unknown';
      const stageIdx = getStageIndex(act.walkInStatus || '');
      const assocUser = Object.values(users).find(u => u.email?.toLowerCase() === act.executiveEmail?.toLowerCase());

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
          seminarDate: act.seminarDate || act.seminarAppointmentDate || '',
          followUpDate: act.followUpDate || '',
        };
      } else {
        schoolMap[key].visitCount++;
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
        if (act.seminarDate || act.seminarAppointmentDate) {
          schoolMap[key].seminarDate = act.seminarDate || act.seminarAppointmentDate;
        }
        if (act.followUpDate) {
          schoolMap[key].followUpDate = act.followUpDate;
        }
      }
    });

    let result = Object.values(schoolMap);

    // Auto-bump to Seminar Confirmed stage if a seminar date exists
    result.forEach(s => {
      if (s.seminarDate) {
        s.stageIndex = 4; // Index of 'Seminar Confirmed' stage
      }
    });

    // Apply Filters to result
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.schoolName.toLowerCase().includes(q) || s.executiveName.toLowerCase().includes(q));
    }
    
    if (dateFilter) {
      result = result.filter(s => {
        const vDate = s.lastVisitDate ? new Date(s.lastVisitDate).toISOString().split('T')[0] : '';
        const sDate = s.seminarDate ? new Date(s.seminarDate).toISOString().split('T')[0] : '';
        const fDate = s.followUpDate ? new Date(s.followUpDate).toISOString().split('T')[0] : '';
        return (vDate === dateFilter || sDate === dateFilter || fDate === dateFilter);
      });
    }

    return result;
  }, [crmActivities, apiLeads, users, searchQuery, dateFilter]);

  const sortedAndPagedData = useMemo(() => {
    let sortableData = [...pipelineData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';
        
        // Handle dates
        if (sortConfig.key === 'lastVisitDate') {
          aValue = new Date(aValue as string).getTime() as any;
          bValue = new Date(bValue as string).getTime() as any;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by last visit date descending
      sortableData.sort((a, b) => new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime());
    }
    
    return sortableData;
  }, [pipelineData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndPagedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndPagedData, currentPage, itemsPerPage]);

  const handleSort = (key: keyof SchoolPipelineEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  // Group by stage (for Board view)
  const stageGroups = useMemo(() => {
    const groups: Record<number, SchoolPipelineEntry[]> = { [-1]: [], 0: [], 1: [], 2: [], 3: [], 4: [] };
    pipelineData.forEach(s => {
      const idx = s.stageIndex >= 0 ? s.stageIndex : -1;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(s);
    });
    return groups;
  }, [pipelineData]);

  // Load activities for the selected school
  const schoolActivities = useMemo(() => {
    if (!selectedSchool) return [];
    return crmActivities
      .filter(a => (a.schoolName || a.lsqLeadId) === (selectedSchool.schoolName || selectedSchool.lsqLeadId))
      .sort((a, b) => {
        const da = new Date(a.walkInDateTime || a.lsqCreatedOn || '').getTime() || 0;
        const db2 = new Date(b.walkInDateTime || b.lsqCreatedOn || '').getTime() || 0;
        return db2 - da;
      });
  }, [selectedSchool, crmActivities]);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-gray-900 animate-in fade-in duration-700 relative">
      {/* Top Bar & Filters */}
      <div className="flex flex-col border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between px-6 py-4 bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">CRM Hub</h1>
            
            {/* View Toggles */}
            <div className="flex bg-gray-100 p-1 rounded-lg ml-4">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListTodo className="w-4 h-4" /> Leads
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'board' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <KanbanSquare className="w-4 h-4" /> Pipeline
              </button>
              <button
                onClick={() => setViewMode('tasks')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'tasks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" /> Tasks
              </button>
            </div>
          </div>

          {viewMode !== 'tasks' && (
            <GlobalDataFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              associateFilter={associateFilter}
              setAssociateFilter={setAssociateFilter}
              taskTypeFilter={taskTypeFilter}
              setTaskTypeFilter={setTaskTypeFilter as any}
              executives={visibleExecutives}
              managerFilter={managerFilter}
              setManagerFilter={setManagerFilter}
              managers={availableManagers}
              userRole={user?.role}
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {isLoadingLeads && (
          <div className="absolute top-4 right-4 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 z-50">
            <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Syncing with LSQ...
          </div>
        )}

        {viewMode === 'board' && (
          <div className="flex flex-1 overflow-x-auto snap-x snap-mandatory custom-scrollbar relative min-h-0">
            <PipelineBoard
              pipelineData={pipelineData}
              stageGroups={stageGroups}
              selectedSchool={selectedSchool}
              setSelectedSchool={setSelectedSchool}
            />
          </div>
        )}

        {viewMode === 'tasks' && (
          <div className="flex flex-1 overflow-hidden relative bg-white min-h-0">
            <TaskCenter isEmbedded />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="flex-1 flex flex-col bg-card border-x border-t border-border rounded-t-2xl shadow-sm overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
            {paginatedData.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-secondary text-muted-foreground font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('schoolName')}>
                      Lead Name {sortConfig?.key === 'schoolName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3 px-6 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('executiveName')}>
                      Executive {sortConfig?.key === 'executiveName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3 px-6">Last Activity Status</th>
                    <th className="py-3 px-6 w-1/3">Activity Notes</th>
                    <th className="py-3 px-6 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('lastVisitDate')}>
                      Last Visit {sortConfig?.key === 'lastVisitDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {paginatedData.map((lead, i) => {
                    return (
                      <tr 
                        key={lead.lsqLeadId || lead.schoolName || i}
                        onClick={() => setSelectedSchool(lead)}
                        className="hover:bg-secondary/50 cursor-pointer group transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 w-fit transition-colors">
                            <span className="truncate max-w-[300px] block" title={lead.schoolName}>{lead.schoolName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </td>
                        <td className="py-4 px-6 text-foreground font-medium">
                          {lead.executiveName}
                        </td>
                        <td className="py-4 px-6">
                          {lead.latestActivity ? (
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusColor(lead.latestActivity.walkInStatus || lead.latestActivity.activityType || '')}`}>
                              {cleanStatusLabel(lead.latestActivity.walkInStatus || lead.latestActivity.activityType || '')}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6">
                          {lead.latestActivity?.remarks || lead.latestActivity?.notes ? (
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]" title={lead.latestActivity.remarks || lead.latestActivity.notes}>
                              {lead.latestActivity.remarks || lead.latestActivity.notes}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 italic text-xs">No notes provided</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">
                          {lead.lastVisitDate ? new Date(lead.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="h-full w-full p-8 flex items-center justify-center">
                <EmptyState 
                  icon={Building2}
                  title="No leads found"
                  description="Adjust your filters or search query to see more results."
                />
              </div>
            )}
            </div>
            
            {/* Pagination Controls */}
            {sortedAndPagedData.length > itemsPerPage && (
              <div className="p-4 border-t border-border bg-card shrink-0 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedAndPagedData.length)} of {sortedAndPagedData.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-border rounded-md bg-secondary hover:bg-border disabled:opacity-50 transition-colors text-foreground font-medium"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage * itemsPerPage >= sortedAndPagedData.length}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-3 py-1.5 border border-border rounded-md bg-secondary hover:bg-border disabled:opacity-50 transition-colors text-foreground font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Detail Sheet for all views */}
        <SchoolDetailSheet
          selectedSchool={selectedSchool}
          setSelectedSchool={setSelectedSchool}
          schoolActivities={schoolActivities}
        />
      </div>
    </div>
  );
}
