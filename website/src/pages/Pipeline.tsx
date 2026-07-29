import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';

import { type SchoolPipelineEntry, getStageIndex } from '../components/pipeline/types';
import { PipelineBoard } from '../components/pipeline/PipelineBoard';

import { SchoolDetailSheet } from '../components/pipeline/SchoolDetailSheet';
import { GlobalDataFilter } from '../components/GlobalDataFilter';

export default function Pipeline() {
  const { user, users } = useAuthStore();
  const [crmActivities, setCrmActivities] = useState<any[]>([]);

  // Shared Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'seminar' | 'follow_up'>('all');

  const [selectedSchool, setSelectedSchool] = useState<SchoolPipelineEntry | null>(null);
  const [schoolActivities, setSchoolActivities] = useState<any[]>([]);

  // Compute available managers based on RBAC
  const availableManagers = useMemo(() => {
    if (!user) return [];
    const allUsers = Object.values(users);
    if (user.role === 'admin') return allUsers.filter(u => u.role === 'teamLead');
    if (user.role === 'regionalManager') return allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id);
    return [];
  }, [user, users]);

  // Fetch all CRM activities for the team
  useEffect(() => {
    if (!user) return;

    const allUsers = Object.values(users);
    let visibleUsers: any[] = [];
    
    if (user.role === 'admin' || user.role === 'regionalManager') {
      if (managerFilter !== 'all') {
        // Filter strictly to the selected team's executives
        visibleUsers = allUsers.filter(u => u.role === 'executive' && u.managerId === managerFilter);
      } else {
        // "All Teams" - get all relevant executives
        if (user.role === 'admin') {
          visibleUsers = allUsers.filter(u => u.role === 'executive');
        } else {
          const myManagerIds = new Set(availableManagers.map(m => m.id));
          visibleUsers = allUsers.filter(u => u.role === 'executive' && u.managerId && myManagerIds.has(u.managerId));
        }
      }
    } else if (user.role === 'teamLead') {
      visibleUsers = allUsers.filter(u => u.managerId === user.id);
    }

    const teamIds = visibleUsers
      .map(u => u.email?.toLowerCase())
      .filter(Boolean);

    if (teamIds.length === 0) {
      setCrmActivities([]);
      return;
    }

    const q = query(
      collection(db, 'crmActivities'),
      where('executiveEmail', 'in', teamIds.slice(0, 30)) // Firestore 'in' limit is 30
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const activities: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      activities.sort((a, b) => {
        const da = new Date(a.lsqCreatedOn || 0).getTime();
        const db2 = new Date(b.lsqCreatedOn || 0).getTime();
        return db2 - da;
      });
      setCrmActivities(activities);
    });

    return () => unsub();
  }, [user, users, managerFilter, availableManagers]);

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
          seminarDate: act.seminarDate || act.seminarAppointmentDate || '',
          followUpDate: act.followUpDate || '',
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
        if (act.seminarDate || act.seminarAppointmentDate) {
          schoolMap[key].seminarDate = act.seminarDate || act.seminarAppointmentDate;
        }
        if (act.followUpDate) {
          schoolMap[key].followUpDate = act.followUpDate;
        }
      }
    });

    return Object.values(schoolMap);
  }, [crmActivities, users]);

  // Group by stage (filtered)
  const stageGroups = useMemo(() => {
    const groups: Record<number, SchoolPipelineEntry[]> = { [-1]: [], 0: [], 1: [], 2: [], 3: [] };

    pipelineData
      .filter(s => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!s.schoolName.toLowerCase().includes(q) && !s.executiveName.toLowerCase().includes(q)) return false;
        }
        if (associateFilter !== 'all' && s.executiveEmail !== associateFilter) return false;
        if (dateFilter) {
          const vDate = s.lastVisitDate ? new Date(s.lastVisitDate).toISOString().split('T')[0] : '';
          const sDate = s.seminarDate ? new Date(s.seminarDate).toISOString().split('T')[0] : '';
          const fDate = s.followUpDate ? new Date(s.followUpDate).toISOString().split('T')[0] : '';
          if (vDate !== dateFilter && sDate !== dateFilter && fDate !== dateFilter) return false;
        }
        return true;
      })
      .forEach(s => {
        const idx = s.stageIndex >= 0 ? s.stageIndex : -1;
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(s);
      });

    return groups;
  }, [pipelineData, searchQuery, associateFilter, dateFilter]);

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
    <div className="flex flex-col h-[calc(100vh-48px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-gray-900 animate-in fade-in duration-700">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Pipeline Overview</h1>
        <GlobalDataFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          associateFilter={associateFilter}
          setAssociateFilter={setAssociateFilter}
          taskTypeFilter={taskTypeFilter}
          setTaskTypeFilter={setTaskTypeFilter as any}
          executives={Object.values(users).filter(u => u.role === 'executive')}
          managerFilter={managerFilter}
          setManagerFilter={setManagerFilter}
          managers={availableManagers}
          userRole={user?.role}
        />
      </div>

      {/* Main horizontally scrolling content */}
      <div className="flex flex-1 overflow-x-auto snap-x snap-mandatory custom-scrollbar relative min-h-0">
        <PipelineBoard
          pipelineData={pipelineData}
          stageGroups={stageGroups}
          selectedSchool={selectedSchool}
          setSelectedSchool={setSelectedSchool}
        />

        <SchoolDetailSheet
          selectedSchool={selectedSchool}
          setSelectedSchool={setSelectedSchool}
          schoolActivities={schoolActivities}
        />
      </div>
    </div>
  );
}
