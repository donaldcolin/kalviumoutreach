import { Building2, ExternalLink } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { type SchoolPipelineEntry, getStageIndex } from './types';
import { STAGE_COLORS, STAGE_SHORT } from '../../lib/constants';
import type { SortConfig } from '../../hooks/useCrmData';

interface CrmTableViewProps {
  paginatedData: SchoolPipelineEntry[];
  sortedAndPagedData: SchoolPipelineEntry[];
  sortConfig: SortConfig;
  handleSort: (key: keyof SchoolPipelineEntry) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setSelectedSchool: (school: SchoolPipelineEntry) => void;
}

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  // If no status or empty, default to gray
  if (!s) return 'bg-gray-50 text-gray-700 border-gray-200';
  
  // Use centralized logic from constants/types for pipeline stages
  const stageIdx = getStageIndex(status);
  if (stageIdx >= 0 && stageIdx < STAGE_COLORS.length) {
    // STAGE_COLORS returns bg-color string (e.g. 'bg-red-500'). 
    // Wait, the pipeline UI uses 'lightColor' for pills if needed, but we can just map it here to similar styles:
    if (stageIdx === 0) return 'bg-red-50 text-red-700 border-red-200';
    if (stageIdx === 1) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (stageIdx === 2) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (stageIdx === 3) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (stageIdx >= 4) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  // Fallback heuristics for non-standard or older strings not captured in STAGE_SHORT
  if (s.includes('refuse') || s.includes('deny') || s.includes('reject') || s.includes('not interested')) return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('api') || s.includes('meeting') || s.includes('success') || s.includes('positive')) return 'bg-green-50 text-green-700 border-green-200';
  if (s.includes('follow up') || s.includes('call') || s.includes('schedule')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('interest')) return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

const cleanStatusLabel = (status: string) => {
  if (!status) return 'Update';
  const stageIdx = getStageIndex(status);
  if (stageIdx >= 0) return STAGE_SHORT[stageIdx] || status.replace(/\s*-\s*[A-Z]+$/, '');
  return status.replace(/\s*-\s*[A-Z]+$/, '');
};

export function CrmTableView({
  paginatedData,
  sortedAndPagedData,
  sortConfig,
  handleSort,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setSelectedSchool
}: CrmTableViewProps) {
  return (
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
  );
}
