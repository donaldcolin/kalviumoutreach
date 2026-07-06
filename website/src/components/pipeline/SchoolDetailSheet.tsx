import { User, Phone, FileText, Calendar, Building2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { type SchoolPipelineEntry, STAGES, getStageIndex } from './types';

interface SchoolDetailSheetProps {
  selectedSchool: SchoolPipelineEntry | null;
  setSelectedSchool: (school: SchoolPipelineEntry | null) => void;
  schoolActivities: any[];
}

export function SchoolDetailSheet({ selectedSchool, setSelectedSchool, schoolActivities }: SchoolDetailSheetProps) {
  return (
    <Sheet open={!!selectedSchool} onOpenChange={(open) => !open && setSelectedSchool(null)}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col border-l-0 shadow-2xl bg-white [&>button]:top-6 [&>button]:right-6">
        {selectedSchool && (
          <>
            {/* Header */}
            <SheetHeader className="relative p-8 pb-6 text-left space-y-0 overflow-hidden shrink-0 border-b border-zinc-100 bg-white">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform translate-x-4 -translate-y-4">
                <Building2 size={140} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedSchool.stageIndex >= 0 ? `${STAGES[selectedSchool.stageIndex].lightColor} ${STAGES[selectedSchool.stageIndex].textColor}` : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {selectedSchool.stageIndex >= 0 ? STAGES[selectedSchool.stageIndex].label : 'Unknown Status'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                    {selectedSchool.visitCount} Visit{selectedSchool.visitCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <SheetTitle className="text-2xl font-bold tracking-tight text-zinc-900 leading-tight pr-8">{selectedSchool.schoolName}</SheetTitle>
                <div className="flex items-center gap-2 mt-3 text-zinc-500">
                  <User size={14} />
                  <p className="text-sm font-medium">{selectedSchool.executiveName}</p>
                </div>
              </div>
            </SheetHeader>

            {/* Quick info from latest activity */}
            {selectedSchool.latestActivity && (
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-4">School Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedSchool.latestActivity.boardOfSchool && (
                    <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm transition-all hover:shadow-md">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Board</p>
                      <p className="text-sm font-semibold text-zinc-900">{selectedSchool.latestActivity.boardOfSchool}</p>
                    </div>
                  )}
                  {selectedSchool.latestActivity.studentStrength && (
                    <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm transition-all hover:shadow-md">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Strength</p>
                      <p className="text-sm font-semibold text-zinc-900">{selectedSchool.latestActivity.studentStrength}</p>
                    </div>
                  )}
                  {(selectedSchool.latestActivity.principalName || selectedSchool.latestActivity.picName) && (
                    <div className="col-span-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Primary Contact</p>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                          <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">{selectedSchool.latestActivity.principalName || selectedSchool.latestActivity.picName}</p>
                          {(selectedSchool.latestActivity.principalPhone || selectedSchool.latestActivity.picPhone) && (
                            <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
                              <Phone size={12} />
                              <p className="text-xs">{selectedSchool.latestActivity.principalPhone || selectedSchool.latestActivity.picPhone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity History */}
            <div className="p-6 pb-2 shrink-0 flex items-center justify-between bg-white">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Activity Timeline</h4>
            </div>
            <ScrollArea className="flex-1 px-6 pb-6 bg-white">
              <div className="space-y-6 mt-2 relative before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-[2px] before:bg-zinc-100">
                {schoolActivities.map((act, idx) => {
                  const stageIdx = getStageIndex(act.walkInStatus || '');
                  const date = act.walkInDateTime || act.lsqCreatedOn;
                  return (
                    <div key={act.id || idx} className="relative flex items-start gap-4 group">
                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0" 
                           style={{ backgroundColor: stageIdx === 0 ? '#ef4444' : stageIdx === 1 ? '#f59e0b' : stageIdx === 2 ? '#3b82f6' : stageIdx === 3 ? '#10b981' : '#d4d4d8' }} />
                      
                      <div className="flex-1 bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group-hover:border-zinc-200">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {act.typeOfWalkIn || act.activityType || 'Visit'}
                            </span>
                            {act.walkInStatus && (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${stageIdx >= 0 ? STAGES[stageIdx].lightColor : 'bg-zinc-100 border border-zinc-200'} ${stageIdx >= 0 ? STAGES[stageIdx].textColor : 'text-zinc-600'}`}>
                                {STAGES[stageIdx]?.short || act.walkInStatus}
                              </span>
                            )}
                          </div>
                          {date && (
                            <span className="text-[10px] text-zinc-400 font-semibold bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                              {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        
                        {/* Outcome */}
                        <div className="text-sm font-medium text-zinc-900 mt-1 leading-snug">
                          {stageIdx === 0 && act.refusedEntryReason && <p>{act.refusedEntryReason}</p>}
                          {stageIdx === 1 && act.statusFrontDesk && <p>{act.statusFrontDesk}</p>}
                          {stageIdx === 2 && act.statusPIC && <p>{act.statusPIC}</p>}
                          {stageIdx === 3 && act.statusPrincipal && <p>{act.statusPrincipal}</p>}
                          {(!act.refusedEntryReason && !act.statusFrontDesk && !act.statusPIC && !act.statusPrincipal) && (
                            <p className="text-zinc-500 italic font-normal text-xs">No specific outcome recorded.</p>
                          )}
                        </div>
                        
                        {act.notes && (
                          <div className="mt-3 p-3 rounded-xl bg-zinc-50/80 text-xs text-zinc-600 border border-zinc-100">
                            <p className="flex items-start gap-2">
                              <FileText size={12} className="mt-0.5 shrink-0 text-zinc-400" />
                              <span className="leading-relaxed">{act.notes}</span>
                            </p>
                          </div>
                        )}
                        
                        {date && (
                          <p className="text-[10px] text-zinc-400 font-medium mt-3 flex items-center gap-1.5">
                            <Calendar size={10} />
                            {new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {schoolActivities.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={20} className="text-zinc-300" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900">No activity history</p>
                    <p className="text-xs text-zinc-500 mt-1">There are no recorded visits for this school yet.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
