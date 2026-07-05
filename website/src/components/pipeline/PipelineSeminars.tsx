import React, { useMemo } from 'react';
import { Calendar, User, ChevronRight } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { type SchoolPipelineEntry } from './types';

interface PipelineSeminarsProps {
  pipelineData: SchoolPipelineEntry[];
  setSelectedSchool: (school: SchoolPipelineEntry) => void;
}

export function PipelineSeminars({ pipelineData, setSelectedSchool }: PipelineSeminarsProps) {
  const seminars = useMemo(() => {
    return pipelineData
      .filter(s => s.seminarDate)
      .sort((a, b) => new Date(a.seminarDate!).getTime() - new Date(b.seminarDate!).getTime());
  }, [pipelineData]);

  // Calculate associate stats
  const associateStats = useMemo(() => {
    const stats: Record<string, { count: number, name: string }> = {};
    seminars.forEach(s => {
      const key = s.executiveEmail || s.executiveName || 'Unknown';
      if (!stats[key]) {
        stats[key] = { count: 0, name: s.executiveName || 'Unknown' };
      }
      stats[key].count++;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [seminars]);

  return (
    <div className="w-full shrink-0 snap-center flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <Calendar className="w-5 h-5 text-zinc-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Upcoming Seminars</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{seminars.length} seminars scheduled</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="pb-12 space-y-8">
          
          {/* Associate Counter Section */}
          {associateStats.length > 0 && (
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Seminars by Associate</h2>
              <div className="flex flex-wrap gap-2">
                {associateStats.map(stat => (
                  <div key={stat.name} className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <User size={12} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700">{stat.name}</span>
                    <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seminars Grid */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {seminars.map(school => (
                <button
                  key={school.schoolName}
                  onClick={() => setSelectedSchool(school)}
                  className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-3 group"
                >
                  <div className="flex justify-between items-start w-full gap-3">
                    <h3 className="font-semibold text-zinc-900 line-clamp-2">{school.schoolName}</h3>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-bold whitespace-nowrap">
                      {new Date(school.seminarDate!).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-600 font-medium">{school.executiveName}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={12} className="text-zinc-400" />
                    </div>
                  </div>
                </button>
              ))}
              {seminars.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Calendar className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No upcoming seminars scheduled</p>
                  <p className="text-sm text-zinc-400 mt-1">Schools with seminar dates will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
