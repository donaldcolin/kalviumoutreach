import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsTabProps {
  users: Record<string, any>;
  globalActivities: any[];
}

export function AnalyticsTab({ users, globalActivities }: AnalyticsTabProps) {
  // Aggregate activities by Associate
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    
    globalActivities.forEach(a => {
      // Find the associate based on email
      const execEmail = a.executiveEmail?.toLowerCase();
      if (!execEmail) return;
      const execId = Object.keys(users).find(id => users[id].email?.toLowerCase() === execEmail);
      if (execId) {
        counts[execId] = (counts[execId] || 0) + 1;
      }
    });

    const chartData = Object.entries(counts).map(([execId, count]) => {
      const u = users[execId];
      return {
        name: u ? u.name : 'Unknown',
        activities: count
      };
    });

    // Sort by most activities
    return chartData.sort((a, b) => b.activities - a.activities);
  }, [globalActivities, users]);

  return (
    <div className="flex-1 overflow-y-auto animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-1 gap-6">
        
        {/* Performance Chart */}
        <div className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Team Performance (Last 7 Days)</h3>
            <p className="text-zinc-500 text-sm">Number of CRM activities completed per associate.</p>
          </div>
          <div className="h-[300px] w-full">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="activities" fill="#18181b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">
                Not enough data to display chart.
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white p-6 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl">
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight mb-6">Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="pb-3 font-semibold">Rank</th>
                  <th className="pb-3 font-semibold">Associate</th>
                  <th className="pb-3 font-semibold text-right">Total Visits</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.name} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 font-medium text-zinc-900 w-16">#{idx + 1}</td>
                    <td className="py-4 font-medium text-zinc-900 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-bold border border-zinc-200">
                        {row.name.substring(0, 2).toUpperCase()}
                      </div>
                      {row.name}
                    </td>
                    <td className="py-4 font-bold text-zinc-900 text-right">{row.activities}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-400">No visits recorded yet.</td>
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
