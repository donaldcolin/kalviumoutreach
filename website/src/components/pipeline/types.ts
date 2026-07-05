export const STAGES = [
  { key: 'Refused Entry - RE', short: 'RE', label: 'Refused Entry', color: 'bg-red-500', lightColor: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
  { key: 'Front Desk Interaction - FDI', short: 'FDI', label: 'Front Desk', color: 'bg-amber-500', lightColor: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
  { key: 'PIC Interaction - PCI', short: 'PCI', label: 'PIC Interaction', color: 'bg-blue-500', lightColor: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
  { key: 'Principal Interaction - PI', short: 'PI', label: 'Principal', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
];

export function getStageIndex(walkInStatus: string): number {
  if (!walkInStatus) return -1;
  return STAGES.findIndex(s => walkInStatus.includes(s.short) || walkInStatus.includes(s.key));
}

export interface SchoolPipelineEntry {
  schoolName: string;
  lsqLeadId: string;
  latestActivity: any;
  stageIndex: number;
  visitCount: number;
  lastVisitDate: string;
  executiveName: string;
  executiveEmail: string;
  seminarDate?: string;
}
