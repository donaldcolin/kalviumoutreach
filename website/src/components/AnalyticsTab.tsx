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
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-gray-50 text-gray-900 rounded-xl">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Booked
              </p>
              <p className="text-2xl font-bold text-gray-900">{totals.booked}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-gray-900 text-white rounded-xl">
              <Presentation size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-900" /> Conducted
              </p>
              <p className="text-2xl font-bold text-gray-900">{totals.conducted}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-gray-50 text-gray-900 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Active</p>
              <p className="text-2xl font-bold text-gray-900">{totals.activeCount}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-900 shadow-sm flex items-start gap-4 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-gray-50">
              <Trophy size={80} />
            </div>
            <div className="p-3 bg-gray-900 text-white rounded-xl relative z-10">
              <Trophy size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">Top Performer</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{topPerformer ? topPerformer.name : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Performance Chart */}
        <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-2xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Associate Performance</h3>
              <p className="text-gray-500 text-sm mt-1">Comparing booked vs. conducted seminars by team member.</p>
            </div>
          </div>
          <div className="h-[340px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', fontWeight: 500 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 500, color: '#6b7280' }} />
                  <Bar name="Booked" dataKey="booked" fill="#d1d5db" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar name="Conducted" dataKey="conducted" fill="#111827" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                    <Presentation size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No seminar data yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Leaderboard</h3>
              <p className="text-gray-500 text-sm mt-1">Ranked by total seminars booked and conducted.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-widest text-gray-400 bg-gray-50/50">
                <tr>
                  <th className="px-8 py-4 font-bold w-24">Rank</th>
                  <th className="px-8 py-4 font-bold">Associate</th>
                  <th className="px-8 py-4 font-bold text-center">Booked</th>
                  <th className="px-8 py-4 font-bold text-center">Conducted</th>
                  <th className="px-8 py-4 font-bold text-right w-1/4">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {chartData.map((row, idx) => {
                  const maxScore = topPerformer ? topPerformer.score : 1;
                  const percent = Math.max(5, (row.score / maxScore) * 100);
                  
                  return (
                    <tr key={row.name} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        {idx === 0 ? (
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold shadow-sm">
                            <Trophy size={14} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white text-gray-400 border border-gray-200 flex items-center justify-center font-bold">
                            #{idx + 1}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 font-semibold text-gray-900 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-gray-900 text-xs font-bold border border-gray-200 group-hover:border-gray-300 shadow-sm transition-colors">
                          {row.name.substring(0, 2).toUpperCase()}
                        </div>
                        {row.name}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-semibold text-gray-500">
                          {row.booked}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-bold text-gray-900">
                          {row.conducted}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-1.5 w-full max-w-[120px] bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${idx === 0 ? 'bg-gray-900' : 'bg-gray-400'}`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {chartData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">No seminars recorded in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
