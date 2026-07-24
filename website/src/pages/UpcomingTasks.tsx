import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';

import { type SchoolPipelineEntry, getStageIndex } from '../components/pipeline/types';
import { PipelineSeminars } from '../components/pipeline/PipelineSeminars';
import { SchoolDetailSheet } from '../components/pipeline/SchoolDetailSheet';
import { PipelineFilterPopover } from '../components/pipeline/PipelineFilterPopover';

export default function UpcomingTasks() {
  const { user, users } = useAuthStore();
  const [crmActivities, setCrmActivities] = useState<any[]>([]);

  // Shared Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'seminar' | 'follow_up'>('all');

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
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Upcoming Tasks</h1>
        <PipelineFilterPopover
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          associateFilter={associateFilter}
          setAssociateFilter={setAssociateFilter}
          taskTypeFilter={taskTypeFilter}
          setTaskTypeFilter={setTaskTypeFilter as any}
          executives={Object.values(users).filter(u => u.role === 'executive')}
        />
      </div>

      {/* Main horizontally scrolling content */}
      <div className="flex flex-1 overflow-x-auto custom-scrollbar relative min-h-0">
        <PipelineSeminars
          pipelineData={pipelineData}
          setSelectedSchool={setSelectedSchool}
          searchQuery={searchQuery}
          dateFilter={dateFilter}
          associateFilter={associateFilter}
          taskTypeFilter={taskTypeFilter}
          setAssociateFilter={setAssociateFilter}
          setTaskTypeFilter={setTaskTypeFilter as any}
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
