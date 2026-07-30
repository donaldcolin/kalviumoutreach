import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, CalendarCheck, Presentation, Users } from 'lucide-react';

interface AnalyticsTabProps {
  users: Record<string, any>;
  globalActivities: any[];
}

export function AnalyticsTab({ users, globalActivities }: AnalyticsTabProps) {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');

  // Aggregate activities by Associate
  const { chartData, totals } = useMemo(() => {
    const stats: Record<string, { booked: number; conducted: number }> = {};
    let totalBooked = 0;
    let totalConducted = 0;
    
    // Pre-populate with all users so everyone appears on the chart and leaderboard
    Object.keys(users).forEach(execId => {
      stats[execId] = { booked: 0, conducted: 0 };
    });

    globalActivities.forEach(a => {
      // Find the associate based on email
      const execEmail = a.executiveEmail?.toLowerCase();
      if (!execEmail) return;
      const execId = Object.keys(users).find(id => users[id].email?.toLowerCase() === execEmail);
      if (!execId) return;

      // Algorithm: Check if seminar was booked
      if (a.seminarDate || a.seminarAppointmentDate) {
        stats[execId].booked += 1;
        totalBooked += 1;
      }

      // Algorithm: Check if seminar was conducted
      const typeStr = (a.typeOfWalkIn || a.activityType || '').toLowerCase();
      const statusStr = (a.walkInStatus || '').toLowerCase();
      if (typeStr.includes('seminar') || statusStr.includes('seminar')) {
        stats[execId].conducted += 1;
        totalConducted += 1;
      }
    });

    const data = Object.entries(stats)
      .map(([execId, s]) => {
        const u = users[execId];
        return {
          name: u ? u.name : 'Unknown',
          booked: s.booked,
          conducted: s.conducted,
          score: (s.booked * 1) + (s.conducted * 2) // Simple score for sorting
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name); // Alphabetical tie-breaker for 0 score
      });

    return { chartData: data, totals: { booked: totalBooked, conducted: totalConducted, activeCount: data.filter(d => d.score > 0).length } };
  }, [globalActivities, users]);

  const topPerformer = chartData.length > 0 ? chartData[0] : null;

  return (
    <div className="flex-1 overflow-y-auto animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-1 gap-8">
        
        {/* Header & Time Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Seminar Performance</h2>
          <div className="flex items-center p-1 bg-gray-100 rounded-lg shrink-0">
            <button onClick={() => setTimeFilter('week')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeFilter === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>This Week</button>
            <button onClick={() => setTimeFilter('month')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeFilter === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>This Month</button>
            <button onClick={() => setTimeFilter('all')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>All Time</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-card flex items-start gap-4">
            <div className="p-3 bg-secondary text-foreground rounded-xl">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Booked
              </p>
              <p className="text-2xl font-bold text-foreground">{totals.booked}</p>
            </div>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border shadow-card flex items-start gap-4">
            <div className="p-3 bg-primary text-primary-foreground rounded-xl">
              <Presentation size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Conducted
              </p>
              <p className="text-2xl font-bold text-foreground">{totals.conducted}</p>
            </div>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-border shadow-card flex items-start gap-4">
            <div className="p-3 bg-secondary text-foreground rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-foreground">{totals.activeCount}</p>
            </div>
          </div>
          <div className="bg-foreground p-5 rounded-2xl border border-foreground shadow-card flex items-start gap-4 relative overflow-hidden text-background">
            <div className="absolute -right-4 -bottom-4 text-background/10">
              <Trophy size={80} />
            </div>
            <div className="p-3 bg-background/20 text-background rounded-xl relative z-10">
              <Trophy size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-background/70 mb-1">Top Performer</p>
              <p className="text-lg font-bold text-background leading-tight">{topPerformer ? topPerformer.name : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Performance Chart */}
        <div className="bg-card p-8 border border-border shadow-card rounded-2xl flex flex-col h-[500px]">
          <div className="mb-8 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Associate Performance</h3>
              <p className="text-muted-foreground text-sm mt-1">Comparing booked vs. conducted seminars by team member.</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'var(--secondary)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', fontWeight: 500 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }} />
                  <Bar name="Booked" dataKey="booked" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  <Bar name="Conducted" dataKey="conducted" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3 border border-border">
                    <Presentation size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No seminar data yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-card border border-border shadow-card rounded-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-8 pb-6 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Leaderboard</h3>
              <p className="text-muted-foreground text-sm mt-1">Ranked by total seminars booked and conducted.</p>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-widest text-muted-foreground bg-secondary/50 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-bold w-16 text-center">Rank</th>
                  <th className="px-6 py-4 font-bold">Associate</th>
                  <th className="px-6 py-4 font-bold text-center">Score</th>
                  <th className="px-6 py-4 font-bold text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chartData.map((row, idx) => {
                  const maxScore = topPerformer ? topPerformer.score : 1;
                  const percent = Math.max(5, (row.score / maxScore) * 100);
                  
                  return (
                    <tr key={row.name} className="hover:bg-secondary/30 transition-colors group">
                      <td className="px-6 py-4 text-center">
                        {idx === 0 ? (
                          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm mx-auto">
                            <Trophy size={12} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-secondary text-muted-foreground border border-border flex items-center justify-center font-bold text-xs mx-auto">
                            #{idx + 1}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] font-bold border border-border group-hover:border-primary/50 transition-colors shrink-0">
                          {row.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{row.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-foreground">
                          {row.score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-1.5 w-full max-w-[80px] bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {chartData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium">No seminars recorded in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        </div>

      </div>
    </div>
  );
}
