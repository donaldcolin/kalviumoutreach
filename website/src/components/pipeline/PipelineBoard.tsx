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
    <div className="w-full shrink-0 snap-center flex flex-col h-full p-6 border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary border border-border rounded-xl shadow-sm">
            <Building2 className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">School Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">{filteredCount} schools tracked</p>
          </div>
        </div>
      </div>

      {/* Stage count strip */}
      <div className="grid grid-cols-5 gap-4 mb-6 shrink-0">
        {STAGES.map((stage, i) => (
          <div key={stage.short} className={`p-4 rounded-2xl border ${stage.lightColor} transition-all shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2 tracking-tight">{stageGroups[i]?.length || 0}</p>
          </div>
        ))}
      </div>

      {/* Kanban-style columns */}
      <div className="flex-1 grid grid-cols-5 gap-4 overflow-hidden min-h-0">
        {STAGES.map((stage, i) => (
          <div key={stage.short} className="flex flex-col h-full overflow-hidden min-h-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-t-2xl border-t border-x ${stage.lightColor}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
              <span className={`text-[11px] font-bold ml-auto opacity-70 ${stage.textColor}`}>{stageGroups[i]?.length || 0}</span>
            </div>
            <ScrollArea className="flex-1 min-h-0 bg-card border border-t-0 border-border rounded-b-2xl shadow-sm">
              <div className="p-2 space-y-2">
                {(stageGroups[i] || []).map(school => {
                  const isSelected = selectedSchool?.schoolName === school.schoolName;
                  const initials = school.executiveName ? school.executiveName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U';
                  
                  return (
                      <button
                        key={school.schoolName}
                        onClick={() => setSelectedSchool(isSelected ? null : school)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 block border-l-2 ${stage.cardBorder}
                          ${isSelected ? 'bg-secondary/50 border-gray-300 shadow-md' : 'bg-card border-border hover:border-muted-foreground/30 shadow-card hover:shadow-card-hover hover:-translate-y-0.5'}`}
                      >
                      <p className={`text-sm font-semibold tracking-tight truncate text-foreground`}>{school.schoolName}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border bg-secondary text-muted-foreground border-border">
                            {initials}
                          </div>
                          <span className="text-xs font-medium truncate text-muted-foreground">
                            {school.executiveName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
                          {school.visitCount} visits
                        </span>
                      </div>
                      
                      {school.lastVisitDate && (
                        <p className="text-[10px] mt-2 font-medium text-muted-foreground/60">
                          Last: {new Date(school.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </button>
                  );
                })}
                {(!stageGroups[i] || stageGroups[i].length === 0) && (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Building2 size={14} className="text-muted-foreground/50" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">No schools</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
