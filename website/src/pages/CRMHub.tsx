import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { type SchoolPipelineEntry } from '../components/pipeline/types';
import { PipelineBoard } from '../components/pipeline/PipelineBoard';
import { SchoolDetailSheet } from '../components/pipeline/SchoolDetailSheet';
import TaskCenter from './TaskCenter';
import { GlobalDataFilter } from '../components/GlobalDataFilter';
import { KanbanSquare, ListTodo, Calendar } from 'lucide-react';
import { useCrmData } from '../hooks/useCrmData';
import { CrmTableView } from '../components/pipeline/CrmTableView';
import { Skeleton } from '../components/ui/skeleton';

type ViewMode = 'board' | 'tasks' | 'list';

export default function CRMHub() {
  const { user, users } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSchool, setSelectedSchool] = useState<SchoolPipelineEntry | null>(null);

  const crmData = useCrmData(user, users);

  // Load activities for the selected school
  const schoolActivities = selectedSchool
    ? crmData.crmActivities
        .filter(a => (a.schoolName || a.lsqLeadId) === (selectedSchool.schoolName || selectedSchool.lsqLeadId))
        .sort((a, b) => {
          const da = new Date(a.walkInDateTime || a.lsqCreatedOn || '').getTime() || 0;
          const db2 = new Date(b.walkInDateTime || b.lsqCreatedOn || '').getTime() || 0;
          return db2 - da;
        })
    : [];

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
              searchQuery={crmData.searchQuery}
              setSearchQuery={crmData.setSearchQuery}
              dateFilter={crmData.dateFilter}
              setDateFilter={crmData.setDateFilter}
              associateFilter={crmData.associateFilter}
              setAssociateFilter={crmData.setAssociateFilter}
              taskTypeFilter={crmData.taskTypeFilter}
              setTaskTypeFilter={crmData.setTaskTypeFilter as any}
              executives={crmData.visibleExecutives}
              managerFilter={crmData.managerFilter}
              setManagerFilter={crmData.setManagerFilter}
              managers={crmData.availableManagers}
              userRole={user?.role}
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {crmData.isLoadingLeads && (
          <div className="absolute top-4 right-4 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 z-50">
            <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Syncing with LSQ...
          </div>
        )}

        {crmData.isLoadingLeads && crmData.sortedAndPagedData.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col gap-4 bg-card border-x border-t border-border rounded-t-2xl">
            {/* Table Header Skeleton */}
            <div className="flex gap-4 border-b border-border pb-4 mb-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-4 w-1/6" />
               <Skeleton className="h-4 w-1/6" />
               <Skeleton className="h-4 w-1/3" />
               <Skeleton className="h-4 w-1/6" />
            </div>
            {/* Table Rows Skeleton */}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/6" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'board' && (
              <div className="flex flex-1 overflow-x-auto snap-x snap-mandatory custom-scrollbar relative min-h-0">
                <PipelineBoard
                  pipelineData={crmData.pipelineData}
                  stageGroups={crmData.stageGroups}
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
              <CrmTableView
                paginatedData={crmData.paginatedData}
                sortedAndPagedData={crmData.sortedAndPagedData}
                sortConfig={crmData.sortConfig}
                handleSort={crmData.handleSort}
                currentPage={crmData.currentPage}
                setCurrentPage={crmData.setCurrentPage}
                itemsPerPage={crmData.itemsPerPage}
                setSelectedSchool={setSelectedSchool}
              />
            )}
          </>
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
