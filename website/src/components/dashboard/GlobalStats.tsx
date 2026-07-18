import { Users, Activity, Briefcase } from 'lucide-react';

interface GlobalStatsProps {
  totalAssociates: number;
  activeWalkIns: number;
  totalLeads: number;
}

export function GlobalStats({ totalAssociates, activeWalkIns, totalLeads }: GlobalStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-6 shrink-0">
      {[
        { label: "Total Associates", value: totalAssociates, icon: Users },
        { label: "Active Walk-Ins", value: activeWalkIns, icon: Activity },
        { label: "Team Leads", value: totalLeads, icon: Briefcase }
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group rounded-xl">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">{stat.label}</span>
            <stat.icon className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </div>
          <div className="text-5xl font-light text-zinc-900 tracking-tighter">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
