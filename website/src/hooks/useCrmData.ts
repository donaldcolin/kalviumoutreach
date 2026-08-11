import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { type User } from '../stores/authStore';
import { type SchoolPipelineEntry, getStageIndex, type CrmActivity } from '../components/pipeline/types';
import type { Lead } from '@kalvium-outreach/shared';

export type SortConfig = { key: keyof SchoolPipelineEntry; direction: 'asc' | 'desc' } | null;

export function useCrmData(user: User | null, users: Record<string, User>) {
  // Shared Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'seminar' | 'follow_up'>('all');

  // Data State
  const [crmActivities, setCrmActivities] = useState<CrmActivity[]>([]);


  // Table State
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Compute available managers based on RBAC
  const availableManagers = useMemo(() => {
    if (!user) return [];
    return Object.values(users).filter(u => u.role === 'teamLead');
  }, [user, users]);


  const visibleExecutives = useMemo(() => {
    let executives = Object.values(users).filter(u => u.role === 'executive');
    
    if (managerFilter !== 'all') {
      executives = executives.filter(u => u.managerId === managerFilter);
    }
    
    return executives;
  }, [users, managerFilter]);

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
    let allActivities: CrmActivity[] = [];
    
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
        const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CrmActivity));
        
        // Merge activities from different chunks
        allActivities = [...allActivities.filter(a => !chunk.includes(a.executiveEmail?.toLowerCase() || '')), ...activities];
        
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

  // 2. Fetch leads from LeadSquared API using React Query
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-br5zfz4zta-uc.a.run.app';
  if (!import.meta.env.VITE_API_URL) {
    console.warn('VITE_API_URL is missing in environment variables. Falling back to production API for local development.');
  }

  const { data: apiLeads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads', targetTeamIds],
    queryFn: async () => {
      if (targetTeamIds.length === 0) return [];

      let combinedLeads: Lead[] = [];
      const chunkedEmails = [];
      for (let i = 0; i < targetTeamIds.length; i += 5) {
        chunkedEmails.push(targetTeamIds.slice(i, i + 5));
      }

      for (const chunk of chunkedEmails) {
        const token = await auth.currentUser?.getIdToken();
        const results = await Promise.all(
          chunk.map(email => 
            fetch(`${API_BASE_URL}/api/leads?email=${encodeURIComponent(email)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(res => res.json())
              .then(res => ({ ...res, email }))
              .catch(() => ({ success: false, leads: [], email }))
          )
        );
        
        results.forEach(res => {
          if (res.success && Array.isArray(res.leads)) {
            const leadsWithEmail = res.leads.map((l: any) => ({
              ...l,
              OwnerEmailAddress: l.OwnerEmailAddress || l.OwnerEmail || res.email
            }));
            combinedLeads = [...combinedLeads, ...leadsWithEmail];
          }
        });
      }
      return combinedLeads;
    },
    enabled: targetTeamIds.length > 0
  });

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
          seminarDate: (act as any).seminarDate || act.seminarAppointmentDate || '',
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
        if ((act as any).seminarDate || act.seminarAppointmentDate) {
          schoolMap[key].seminarDate = (act as any).seminarDate || act.seminarAppointmentDate;
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

  return {
    searchQuery, setSearchQuery,
    dateFilter, setDateFilter,
    managerFilter, setManagerFilter,
    associateFilter, setAssociateFilter,
    taskTypeFilter, setTaskTypeFilter,
    crmActivities,
    apiLeads,
    isLoadingLeads,
    sortConfig,
    currentPage, setCurrentPage,
    itemsPerPage,
    availableManagers,
    visibleExecutives,
    pipelineData,
    sortedAndPagedData,
    paginatedData,
    handleSort,
    stageGroups
  };
}
