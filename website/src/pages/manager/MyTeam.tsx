import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../stores/authStore';
import { Search, Building2, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { CrmActivityCard } from '../../components/CrmActivityCard';
import { type SchoolPipelineEntry, getStageIndex } from '../../components/pipeline/types';

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('refuse') || s.includes('deny') || s.includes('reject') || s.includes('not interested')) return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('api') || s.includes('meeting') || s.includes('success') || s.includes('positive')) return 'bg-green-50 text-green-700 border-green-200';
  if (s.includes('follow up') || s.includes('call') || s.includes('schedule')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('interest')) return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

export default function TeamLeads() {
  const { user, users } = useAuthStore();
  
  const [selectedAssociate, setSelectedAssociate] = useState<string | null>(null);
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [apiLeads, setApiLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<SchoolPipelineEntry | null>(null);

  // Compute available associates for this manager
  const availableAssociates = useMemo(() => {
    if (!user) return [];
    const allUsers = Object.values(users);
    
    if (user.role === 'admin') {
      return allUsers.filter(u => u.role === 'executive');
    }
    
    if (user.role === 'regionalManager') {
      const myTeamLeads = new Set(allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id).map(u => u.id));
      return allUsers.filter(u => u.role === 'executive' && u.managerId && myTeamLeads.has(u.managerId));
    }
    
    if (user.role === 'teamLead') {
      return allUsers.filter(u => u.managerId === user.id);
    }
    
    return [];
  }, [user, users]);

  // Set default selected associate
  useEffect(() => {
    if (availableAssociates.length > 0 && !selectedAssociate) {
      setSelectedAssociate(availableAssociates[0].email);
    }
  }, [availableAssociates, selectedAssociate]);

  // Fetch activities for selected associate
  useEffect(() => {
    if (!selectedAssociate) {
      setCrmActivities([]);
      return;
    }

    const q = query(
      collection(db, 'crmActivities'),
      where('executiveEmail', '==', selectedAssociate)
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
  }, [selectedAssociate]);

  // Fetch leads directly from LeadSquared via webhook-server
  useEffect(() => {
    if (!selectedAssociate) {
      setApiLeads([]);
      return;
    }
    
    setIsLoadingLeads(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';
    
    fetch(`${API_BASE_URL}/api/leads?email=${encodeURIComponent(selectedAssociate)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.leads)) {
          setApiLeads(data.leads);
        } else {
          setApiLeads([]);
        }
      })
      .catch(err => {
        console.error('Error fetching leads:', err);
        setApiLeads([]);
      })
      .finally(() => setIsLoadingLeads(false));
  }, [selectedAssociate]);

  // Build Leads (Schools) from activities and API leads
  const leads = useMemo(() => {
    const schoolMap: Record<string, SchoolPipelineEntry> = {};

    // 1. Initialize with all leads from the API
    apiLeads.forEach(lead => {
      // PER USER REQUIREMENT: Hardcode filter to only show 'School Prospect'
      if (lead.ProspectStage !== 'School Prospect') {
        return;
      }
      
      const schoolName = lead.Company || [lead.FirstName, lead.LastName].filter(Boolean).join(' ') || 'Unknown School';
      const leadId = lead.ProspectID || '';
      if (!leadId) return;
      
      const assocUser = Object.values(users).find(u => u.email?.toLowerCase() === selectedAssociate?.toLowerCase());
      
      schoolMap[schoolName || leadId] = {
        schoolName: schoolName,
        lsqLeadId: leadId,
        latestActivity: null,
        stageIndex: getStageIndex('School Prospect'),
        visitCount: 0,
        lastVisitDate: '',
        executiveName: assocUser?.name || selectedAssociate || '',
        executiveEmail: selectedAssociate || '',
        prospectStage: lead.ProspectStage || '',
        source: lead.Source || '',
        modifiedOn: lead.ModifiedOn || ''
      };
    });

    // 2. Override and enhance with CRM Activities
    crmActivities.forEach(act => {
      const key = act.schoolName || act.lsqLeadId || 'unknown';
      if (!schoolMap[key]) {
        return;
      }

      schoolMap[key].visitCount++;
      const existing = schoolMap[key];
      const existingDate = new Date(existing.lastVisitDate).getTime() || 0;
      const newDate = new Date(act.walkInDateTime || act.lsqCreatedOn || '').getTime() || 0;
      
      if (newDate > existingDate) {
        schoolMap[key].latestActivity = act;
        schoolMap[key].lastVisitDate = act.walkInDateTime || act.lsqCreatedOn || '';
      }
    });

    let result = Object.values(schoolMap);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.schoolName.toLowerCase().includes(q) || 
        l.lsqLeadId.toLowerCase().includes(q)
      );
    }
    
    // Sort by most recently modified
    return result.sort((a, b) => {
      const timeA = a.modifiedOn ? new Date(a.modifiedOn).getTime() : 0;
      const timeB = b.modifiedOn ? new Date(b.modifiedOn).getTime() : 0;
      return timeB - timeA;
    });
  }, [crmActivities, apiLeads, users, searchQuery, selectedAssociate]);

  // Lead's Activity History
  const leadActivities = useMemo(() => {
    if (!selectedLead) return [];
    return crmActivities.filter(a => (a.schoolName || a.lsqLeadId || 'unknown') === (selectedLead.schoolName || selectedLead.lsqLeadId || 'unknown'));
  }, [selectedLead, crmActivities]);

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 relative">
      {/* Main Area: Leads List (No Sidebar) */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center gap-4">
          <div className="flex gap-4 items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              School Prospects
            </h2>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            {/* Associate Filter Dropdown instead of Sidebar */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Lead Owner:</span>
              <select
                value={selectedAssociate || ''}
                onChange={(e) => { setSelectedAssociate(e.target.value); setSelectedLead(null); }}
                className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white min-w-[200px]"
              >
                {availableAssociates.map(assoc => (
                  <option key={assoc.id} value={assoc.email}>
                    {assoc.name} ({assoc.regionId})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-gray-500 font-medium ml-4">
              {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'} found
            </span>
          </div>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads..."
              className="pl-10 rounded-md bg-white border-gray-200 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {isLoadingLeads ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-500">Syncing leads with LeadSquared...</p>
            </div>
          ) : leads.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Lead Name</th>
                  <th className="py-3 px-4">Last Activity Status</th>
                  <th className="py-3 px-4 w-1/3">Activity Notes</th>
                  <th className="py-3 px-4">Last Visit</th>
                  <th className="py-3 px-4">Modified On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => {
                  // Removed unused stage variable
                  return (
                    <tr 
                      key={lead.lsqLeadId || lead.schoolName}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-blue-50/50 cursor-pointer group transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-600 hover:underline">{lead.schoolName}</div>
                      </td>
                      <td className="py-3 px-4">
                        {lead.latestActivity ? (
                          <span className={`px-2 py-1 text-xs font-bold rounded-md border ${getStatusColor(lead.latestActivity.walkInStatus || lead.latestActivity.activityType)}`}>
                            {lead.latestActivity.walkInStatus || lead.latestActivity.activityType || 'Update'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {lead.latestActivity?.remarks || lead.latestActivity?.notes ? (
                          <div className="text-sm text-gray-600 truncate max-w-[250px]" title={lead.latestActivity.remarks || lead.latestActivity.notes}>
                            {lead.latestActivity.remarks || lead.latestActivity.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No notes provided</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {lead.lastVisitDate ? new Date(lead.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {lead.modifiedOn ? new Date(lead.modifiedOn).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
              <Building2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">No leads found.</p>
              <p className="text-sm mt-1">Select another associate or clear your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel: Activity History */}
      {selectedLead && (
        <div className="absolute right-0 top-0 bottom-0 w-[450px] bg-white rounded-r-3xl border-l border-gray-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300 z-20">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start sticky top-0 z-10">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedLead.schoolName}</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">Activity Timeline</p>
            </div>
            <button 
              onClick={() => setSelectedLead(null)}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {leadActivities.length > 0 ? leadActivities.map(activity => (
                <div key={activity.id} className="relative mb-6">
                   <CrmActivityCard 
                      activity={activity} 
                      isExpanded={true} 
                      onToggle={() => {}} 
                   />
                </div>
              )) : (
                <p className="text-center text-sm text-gray-400 mt-8">No activities logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
