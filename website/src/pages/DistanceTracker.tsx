import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { calculateDistanceMeters } from '../lib/distance';
import { cleanGpsRoute, type RawPing } from '../lib/gpsUtils';
import { Navigation, ChevronLeft, ChevronRight, Loader2, Search, X, Download } from 'lucide-react';

function computeDistanceKm(points: RawPing[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateDistanceMeters(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total / 1000;
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function DistanceTracker() {
  const { users } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState<'month' | 'week' | 'last-week' | 'today'>('month');

  const daysInMonth = getDaysInMonth(year, month);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Compute which day numbers are "active" based on the range filter
  const activeDays = useMemo<Set<number>>(() => {
    if (rangeFilter === 'month') return new Set(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    const today = new Date();
    if (rangeFilter === 'today') {
      if (year === today.getFullYear() && month === today.getMonth()) {
        return new Set([today.getDate()]);
      }
      return new Set();
    }

    // week = Mon-Sun containing today; last-week = the one before
    const startOfWeek = (d: Date) => {
      const day = d.getDay(); // 0=Sun
      const diff = (day === 0 ? 6 : day - 1); // shift to Mon=0
      const mon = new Date(d);
      mon.setDate(d.getDate() - diff);
      mon.setHours(0, 0, 0, 0);
      return mon;
    };

    let weekStart = startOfWeek(today);
    if (rangeFilter === 'last-week') {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() - 7);
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const days = new Set<number>();
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        days.add(d.getDate());
      }
    }
    return days;
  }, [rangeFilter, year, month, daysInMonth]);

  // distanceMap: { `${userId}_${yyyyMMdd}`: km }
  const [distanceMap, setDistanceMap] = useState<Record<string, number>>({});

  const allExecutives = useMemo(() => {
    return Object.values(users).filter(u => u.role === 'executive');
  }, [users]);

  const teamLeads = useMemo(() => {
    return Object.values(users).filter(u => u.role === 'teamLead');
  }, [users]);

  const executives = useMemo(() => {
    let result = allExecutives;
    if (teamFilter !== 'all') {
      result = result.filter(u => u.managerId === teamFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.regionId && u.regionId.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allExecutives, teamFilter, searchQuery]);


  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goBack = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const goForward = () => {
    if (isCurrentMonth) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Compute stats for selected associate (filtered by active range)
  const selectedStats = useMemo(() => {
    if (!selectedExecId) return null;
    const exec = allExecutives.find(e => e.id === selectedExecId);
    if (!exec) return null;

    let totalKm = 0;
    let daysTracked = 0;
    let maxKm = 0;

    dayNumbers.forEach(d => {
      if (!activeDays.has(d)) return;
      const dateStr = formatDateStr(year, month, d);
      const km = distanceMap[`${exec.id}_${dateStr}`];
      if (km !== undefined) {
        totalKm += km;
        daysTracked++;
        if (km > maxKm) maxKm = km;
      }
    });

    return {
      name: exec.name,
      regionId: exec.regionId,
      managerId: exec.managerId,
      totalKm,
      daysTracked,
      avgKm: daysTracked > 0 ? totalKm / daysTracked : 0,
      maxKm,
    };
  }, [selectedExecId, distanceMap, allExecutives, dayNumbers, year, month, activeDays]);

  const managerName = useMemo(() => {
    if (!selectedStats?.managerId) return null;
    const mgr = users[selectedStats.managerId];
    return mgr?.name || null;
  }, [selectedStats, users]);

  // Fetch all dailyTracks for this month, then their locations
  useEffect(() => {
    if (allExecutives.length === 0) return;

    const fetchMonth = async () => {
      setIsLoading(true);
      setDistanceMap({});

      const firstDay = formatDateStr(year, month, 1);
      const lastDay = formatDateStr(year, month, daysInMonth);

      try {
        const tracksQuery = query(
          collection(db, 'dailyTracks'),
          where('date', '>=', firstDay),
          where('date', '<=', lastDay)
        );
        const tracksSnap = await getDocs(tracksQuery);

        if (tracksSnap.empty) {
          setIsLoading(false);
          return;
        }

        const results: Record<string, number> = {};
        const fetchPromises = tracksSnap.docs.map(async (trackDoc) => {
          const data = trackDoc.data();
          const key = `${data.userId}_${data.date}`;

          const locsSnap = await getDocs(collection(db, 'dailyTracks', trackDoc.id, 'locations'));
          if (locsSnap.empty) return;

          const rawPoints: RawPing[] = [];
          locsSnap.forEach(d => {
            const p = d.data();
            if (typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.ts === 'number') {
              rawPoints.push({
                lat: p.lat,
                lng: p.lng,
                ts: p.ts,
                accuracy: p.accuracy ?? null,
                speed: p.speed ?? null,
              });
            }
          });

          rawPoints.sort((a, b) => a.ts - b.ts);
          // Apply the same GPS cleaning pipeline the Dashboard uses:
          // 1. Filter by accuracy (drop noisy pings > 50m radius)
          // 2. Remove outliers (impossible jumps > 150m from both neighbors)
          // 3. Smooth route (sliding window average to reduce micro-jitter)
          const cleaned = cleanGpsRoute(rawPoints);
          if (cleaned.length > 1) {
            results[key] = computeDistanceKm(cleaned);
          }
        });

        await Promise.all(fetchPromises);
        setDistanceMap(results);
      } catch (e) {
        console.error('Failed to fetch distance data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonth();
  }, [allExecutives, year, month, daysInMonth]);

  const downloadCsv = () => {
    const activeDayNumbers = dayNumbers.filter(d => activeDays.has(d));
    const rangeLabel = rangeFilter === 'month' ? 'Full Month' : rangeFilter === 'week' ? 'This Week' : rangeFilter === 'last-week' ? 'Last Week' : 'Today';

    // Header row
    const header = ['Associate', 'Region', ...activeDayNumbers.map(d => `${d} ${MONTH_NAMES[month].slice(0, 3)}`), `Total (${rangeLabel})`];
    const rows = executives.map(exec => {
      let total = 0;
      const dayCells = activeDayNumbers.map(d => {
        const dateStr = formatDateStr(year, month, d);
        const km = distanceMap[`${exec.id}_${dateStr}`];
        if (km !== undefined) { total += km; return km.toFixed(1); }
        return '';
      });
      return [exec.name, exec.regionId || '', ...dayCells, total.toFixed(1)];
    });

    const csvContent = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distance_${MONTH_NAMES[month].toLowerCase()}_${year}_${rangeFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-4 bg-transparent text-gray-900 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col gap-4 shrink-0">
        {/* Top Row: Title & Core Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Navigation className="w-5 h-5 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Distance Tracker
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={goBack}
                className="p-1.5 rounded-md hover:bg-gray-50 transition-colors text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-900 w-32 text-center">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={goForward}
                disabled={isCurrentMonth}
                className="p-1.5 rounded-md hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={downloadCsv}
              disabled={isLoading || executives.length === 0}
              className="flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Bottom Row: Filters */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search associate..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-4 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
              />
            </div>

            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="h-10 px-4 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer min-w-[160px]"
            >
              <option value="all">All Teams</option>
              {teamLeads.map(tl => (
                <option key={tl.id} value={tl.id}>{tl.name}'s Team</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-gray-100/80 rounded-lg p-1">
            {([['today', 'Today'], ['week', 'This Week'], ['last-week', 'Last Week'], ['month', 'Full Month']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setRangeFilter(key);
                  if (key === 'today' || key === 'week') {
                    setYear(now.getFullYear());
                    setMonth(now.getMonth());
                  } else if (key === 'last-week') {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  rangeFilter === key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Associate Detail Panel */}
      {selectedStats && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedStats.name}</h3>
              <p className="text-xs text-gray-500">
                {selectedStats.regionId}
                {managerName && <span> · {managerName}'s team</span>}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex gap-6">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</div>
                <div className="text-xl font-bold text-gray-900">{selectedStats.totalKm.toFixed(1)} <span className="text-sm font-medium text-gray-500">km</span></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Daily Avg</div>
                <div className="text-xl font-bold text-blue-600">{selectedStats.avgKm.toFixed(1)} <span className="text-sm font-medium text-gray-500">km</span></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Best Day</div>
                <div className="text-xl font-bold text-emerald-600">{selectedStats.maxKm.toFixed(1)} <span className="text-sm font-medium text-gray-500">km</span></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Days Tracked</div>
                <div className="text-xl font-bold text-gray-900">{selectedStats.daysTracked} <span className="text-sm font-medium text-gray-500">/ {activeDays.size}</span></div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedExecId(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            <span className="text-sm text-gray-500 font-medium">Loading distance data...</span>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-20 min-w-[160px] border-r border-gray-100">
                  Associate
                </th>
                {dayNumbers.map(d => (
                  <th key={d} className={`px-1.5 py-3 font-semibold text-center min-w-[44px] text-xs ${activeDays.has(d) ? 'text-gray-700 bg-blue-50/40' : 'text-gray-400'}`}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-gray-700 text-center min-w-[64px] border-l border-gray-200 bg-gray-100/50">
                  {rangeFilter === 'month' ? 'Total' : rangeFilter === 'today' ? 'Today' : rangeFilter === 'week' ? 'This Week' : 'Last Week'}
                </th>
              </tr>
            </thead>
            <tbody>
              {executives.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="text-center py-12 text-gray-400 text-sm">
                    No associates found.
                  </td>
                </tr>
              ) : (
                executives.map((exec) => {
                  let monthTotal = 0;
                  const isSelected = selectedExecId === exec.id;
                  return (
                    <tr
                      key={exec.id}
                      onClick={() => setSelectedExecId(isSelected ? null : exec.id)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className={`px-4 py-2.5 font-medium text-gray-900 sticky left-0 z-10 border-r border-gray-100 ${isSelected ? 'bg-blue-50/60' : 'bg-white'}`}>
                        <div className="truncate max-w-[150px]">{exec.name}</div>
                        <div className="text-[10px] text-gray-400 font-normal truncate">{exec.regionId}</div>
                      </td>
                      {dayNumbers.map(d => {
                        const dateStr = formatDateStr(year, month, d);
                        const key = `${exec.id}_${dateStr}`;
                        const km = distanceMap[key];
                        const isInRange = activeDays.has(d);

                        const cellDate = new Date(year, month, d);
                        const isFuture = cellDate > now;

                        if (isFuture) {
                          return (
                            <td key={d} className="px-1 py-2.5 text-center">
                              <span className="text-gray-200">—</span>
                            </td>
                          );
                        }

                        if (km === undefined) {
                          return (
                            <td key={d} className={`px-1 py-2.5 text-center ${isInRange ? 'bg-blue-50/20' : ''}`}>
                              <span className="text-gray-300">—</span>
                            </td>
                          );
                        }

                        if (isInRange) monthTotal += km;

                        let bgClass = 'bg-gray-50 text-gray-600';
                        if (km >= 5) bgClass = 'bg-emerald-50 text-emerald-700';
                        else if (km >= 2) bgClass = 'bg-blue-50 text-blue-600';
                        else if (km > 0) bgClass = 'bg-amber-50 text-amber-700';
                        if (!isInRange) bgClass += ' opacity-40';

                        return (
                          <td key={d} className={`px-0.5 py-2.5 text-center ${isInRange ? 'bg-blue-50/20' : ''}`}>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${bgClass}`}>
                              {km.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center border-l border-gray-200 bg-gray-50/50">
                        <span className="font-bold text-gray-900 text-xs">
                          {monthTotal.toFixed(1)} km
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
