import { Building2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { type SchoolPipelineEntry, STAGES } from './types';

interface PipelineBoardProps {
  pipelineData: SchoolPipelineEntry[];
  stageGroups: Record<number, SchoolPipelineEntry[]>;
  selectedSchool: SchoolPipelineEntry | null;
  setSelectedSchool: (school: SchoolPipelineEntry | null) => void;
}

export function PipelineBoard({
  stageGroups,
  selectedSchool,
  setSelectedSchool
}: PipelineBoardProps) {
  const filteredCount = Object.values(stageGroups).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="w-full shrink-0 snap-center flex flex-col h-full p-6 border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl shadow-sm">
            <Building2 className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">School Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">{filteredCount} schools tracked</p>
          </div>
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
            <p className="text-3xl font-semibold text-gray-900 mt-2 tracking-tight">{stageGroups[i]?.length || 0}</p>
          </div>
        ))}
      </div>

      {/* Kanban-style columns */}
      <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden min-h-0">
        {STAGES.map((stage, i) => (
          <div key={stage.short} className="flex flex-col h-full overflow-hidden min-h-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border-t border-x ${stage.lightColor}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
              <span className={`text-xs font-bold ml-auto opacity-70 ${stage.textColor}`}>{stageGroups[i]?.length || 0}</span>
            </div>
            <ScrollArea className="flex-1 min-h-0 bg-white border border-t-0 border-gray-100 rounded-b-xl shadow-sm">
              <div className="p-2 space-y-2">
                {(stageGroups[i] || []).map(school => {
                  const isSelected = selectedSchool?.schoolName === school.schoolName;
                  return (
                    <button
                      key={school.schoolName}
                      onClick={() => setSelectedSchool(isSelected ? null : school)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors duration-200 ${isSelected ? 'bg-red-50 text-red-900 border-red-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-900 shadow-sm'}`}
                    >
                      <p className={`text-sm font-semibold tracking-tight truncate ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>{school.schoolName}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-red-700' : 'text-gray-500'}`}>
                          {school.executiveName}
                        </span>
                        <span className={`text-[11px] font-semibold ${isSelected ? 'text-red-700' : 'text-gray-500'}`}>
                          {school.visitCount} visit{school.visitCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {school.lastVisitDate && (
                        <p className={`text-[11px] mt-1 font-medium ${isSelected ? 'text-red-500' : 'text-gray-400'}`}>
                          Last: {new Date(school.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </button>
                  );
                })}
                {(!stageGroups[i] || stageGroups[i].length === 0) && (
                  <div className="py-8 text-center text-gray-400 text-sm font-medium">No schools</div>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
