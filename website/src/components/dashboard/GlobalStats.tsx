import { Users, Activity, TrendingUp } from 'lucide-react';

interface GlobalStatsProps {
  totalAssociates: number;
  activeWalkIns: number;
  isLoading?: boolean;
}

export function GlobalStats({ totalAssociates, activeWalkIns, isLoading }: GlobalStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 shrink-0">
      {[
        { label: "Total Associates", value: totalAssociates, icon: Users, trend: "+2.4%", color: "text-blue-600", bg: "bg-blue-50", shadow: "shadow-blue-500/10" },
        { label: "Active Walk-Ins", value: activeWalkIns, icon: Activity, trend: "+12%", color: "text-red-600", bg: "bg-red-50", shadow: "shadow-red-500/10" }
      ].map((stat, i) => (
        <div key={i} className={`bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group rounded-[20px] transition-all duration-300 hover:shadow-md hover:border-gray-200`}>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">{stat.label}</span>
            <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            {isLoading ? (
              <div className="h-12 w-24 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <div className="text-[2.75rem] leading-none font-bold text-gray-900 tracking-tight">{stat.value}</div>
            )}
            {stat.trend && !isLoading && (
              <div className="flex items-center gap-1 text-green-700 bg-green-50/80 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-100/50">
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
