import { Users, Activity, TrendingUp } from 'lucide-react';

interface GlobalStatsProps {
  totalAssociates: number;
  activeWalkIns: number;
}

export function GlobalStats({ totalAssociates, activeWalkIns }: GlobalStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 shrink-0">
      {[
        { label: "Total Associates", value: totalAssociates, icon: Users, trend: "+2.4%" },
        { label: "Active Walk-Ins", value: activeWalkIns, icon: Activity, trend: "+12%" }
      ].map((stat, i) => (
        <div key={i} className="bg-card p-6 border border-border shadow-card flex flex-col justify-between min-h-[140px] relative overflow-hidden group rounded-2xl">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">{stat.label}</span>
            <stat.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div className="text-5xl font-bold text-foreground tracking-tighter">{stat.value}</div>
            {stat.trend && (
              <div className="flex items-center gap-1 text-success-700 bg-success-50 px-2.5 py-1 rounded-full text-xs font-bold">
                <TrendingUp size={12} />
                {stat.trend}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
