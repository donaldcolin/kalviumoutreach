import { Users, Activity } from 'lucide-react';

interface GlobalStatsProps {
  totalAssociates: number;
  activeWalkIns: number;
  totalLeads: number;
}

export function GlobalStats({ totalAssociates, activeWalkIns }: GlobalStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 shrink-0">
      {[
        { label: "Total Associates", value: totalAssociates, icon: Users },
        { label: "Active Walk-Ins", value: activeWalkIns, icon: Activity }
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group rounded-xl">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-gray-500 tracking-wider uppercase">{stat.label}</span>
            <stat.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
          </div>
          <div className="text-5xl font-semibold text-gray-900 tracking-tighter">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
