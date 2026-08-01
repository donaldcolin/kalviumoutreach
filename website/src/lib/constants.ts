export const STAGE_ORDER = ['Refused Entry - RE', 'Front Desk Interaction - FDI', 'PIC Interaction - PCI', 'Principal Interaction - PI', 'Seminar Confirmed'];
export const STAGE_SHORT = ['RE', 'FDI', 'PCI', 'PI', 'SC'];
export const STAGE_COLORS = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500'];

export function getStageIndex(walkInStatus: string): number {
  if (!walkInStatus) return -1;
  const idx = STAGE_ORDER.findIndex(s => walkInStatus.includes(s.split(' - ')[1]) || walkInStatus.includes(s));
  return idx;
}
