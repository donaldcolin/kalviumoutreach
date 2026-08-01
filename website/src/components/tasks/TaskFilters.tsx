import type { User } from '@kalvium-outreach/shared';

type StatusFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';
type TypeFilter = 'all' | 'seminar' | 'follow-up';
type AssignedByFilter = 'all' | 'Self' | 'Manager';

interface TaskFiltersProps {
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (f: TypeFilter) => void;
  assignedByFilter: AssignedByFilter;
  setAssignedByFilter: (f: AssignedByFilter) => void;
  associateFilter: string;
  setAssociateFilter: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  executives: User[];
  counts: { overdue: number; today: number; upcoming: number; completed: number; total: number };
}

export function TaskFilters({
  statusFilter, setStatusFilter,
  typeFilter, setTypeFilter,
  assignedByFilter, setAssignedByFilter,
  associateFilter, setAssociateFilter,
  searchQuery, setSearchQuery,
  executives,
  counts,
}: TaskFiltersProps) {
  const statusOptions: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: counts.total, color: 'bg-gray-100 text-gray-700' },
    { key: 'overdue', label: 'Overdue', count: counts.overdue, color: 'bg-red-50 text-red-700' },
    { key: 'today', label: 'Today', count: counts.today, color: 'bg-emerald-50 text-emerald-700' },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'bg-blue-50 text-blue-700' },
    { key: 'completed', label: 'Completed', count: counts.completed, color: 'bg-gray-50 text-gray-500' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              statusFilter === opt.key
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : `${opt.color} border-transparent hover:border-gray-200`
            }`}
          >
            {opt.label}
            {opt.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === opt.key ? 'bg-white/20 text-white' : 'bg-black/5'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Secondary filters row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search school name..."
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-56"
        />

        {/* Associate dropdown */}
        <select
          value={associateFilter}
          onChange={e => setAssociateFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="all">All Associates</option>
          {executives.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="all">All Types</option>
          <option value="follow-up">Follow-up</option>
          <option value="seminar">Seminar</option>
        </select>

        {/* Assigned By filter */}
        <select
          value={assignedByFilter}
          onChange={e => setAssignedByFilter(e.target.value as AssignedByFilter)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
        >
          <option value="all">All Sources</option>
          <option value="Self">Self-created</option>
          <option value="Manager">Manager-assigned</option>
        </select>
      </div>
    </div>
  );
}

export type { StatusFilter, TypeFilter, AssignedByFilter };
