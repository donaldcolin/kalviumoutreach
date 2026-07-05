import React from 'react';
import { Search, Building2 } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { type SchoolPipelineEntry, STAGES } from './types';

interface PipelineBoardProps {
  pipelineData: SchoolPipelineEntry[];
  stageGroups: Record<number, SchoolPipelineEntry[]>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
  associateFilter: string;
  setAssociateFilter: (val: string) => void;
  selectedSchool: SchoolPipelineEntry | null;
  setSelectedSchool: (school: SchoolPipelineEntry | null) => void;
}

export function PipelineBoard({
  pipelineData,
  stageGroups,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  associateFilter,
  setAssociateFilter,
  selectedSchool,
  setSelectedSchool
}: PipelineBoardProps) {
  return (
    <div className="w-full shrink-0 snap-center flex flex-col h-full p-6 border-r border-zinc-200">
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
        <div className="flex items-center gap-3">
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border-zinc-200 bg-white h-11 text-sm w-36 px-3"
          />
          <select
            value={associateFilter}
            onChange={(e) => setAssociateFilter(e.target.value)}
            className="rounded-xl border-zinc-200 bg-white h-11 text-sm px-3 border outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Associates</option>
            {Array.from(new Set(pipelineData.map(s => s.executiveEmail))).filter(Boolean).map(email => {
              const assoc = pipelineData.find(s => s.executiveEmail === email);
              return (
                <option key={email} value={email}>{assoc?.executiveName || email}</option>
              );
            })}
          </select>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search..." 
              className="pl-10 rounded-xl border-zinc-200 bg-white h-11 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
  );
}
