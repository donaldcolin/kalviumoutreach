import { useState, useRef } from 'react';
import { Search, ChevronRight, RefreshCw, Users, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuthStore, type User } from '../../stores/authStore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface TeamSidebarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredUsers: User[];
  selectedAssociate: User | null;
  setSelectedAssociate: (user: User) => void;
  handleSyncLSQ: () => void;
  ongoingWalkIns?: Record<string, any>;
  teamTrackingStatus?: Record<string, 'active' | 'ended'>;
  managers: User[];
  selectedManagerId: string;
  setSelectedManagerId: (val: string) => void;
}

export function TeamSidebar({
  searchQuery,
  setSearchQuery,
  filteredUsers,
  selectedAssociate,
  setSelectedAssociate,
  handleSyncLSQ,
  ongoingWalkIns = {},
  teamTrackingStatus = {},
  managers = [],
  selectedManagerId,
  setSelectedManagerId
}: TeamSidebarProps) {
  const { user } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 1000);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`transition-all duration-300 ease-in-out z-50 flex flex-col h-full bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden shrink-0 ${isHovered ? 'w-64' : 'w-20'}`}
    >
      <div className="p-4 flex flex-col gap-4 border-b border-gray-100 shrink-0">
        <div className="flex flex-col relative min-h-[40px]">
          {/* CLOSED STATE */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col items-center gap-1.5 text-gray-400 mt-2">
              <Users className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {selectedManagerId === 'all' ? 'Team' : (managers.find(m => m.id === selectedManagerId)?.name?.substring(0, 3) || 'Team')}
              </span>
            </div>
          </div>

          {/* EXPANDED STATE HEADER */}
          <div className={`w-full flex items-center justify-between transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {(user?.role === 'admin' || user?.role === 'regionalManager') && managers.length > 0 ? (
              <Popover>
                <PopoverTrigger className="flex items-center justify-between flex-1 text-left bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-all outline-none focus:ring-2 focus:ring-red-500/20 group/trigger">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Viewing</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {selectedManagerId === 'all' ? 'All Teams' : `${managers.find(m => m.id === selectedManagerId)?.name}'s Team`}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0 group-hover/trigger:text-gray-600 transition-colors" />
                </PopoverTrigger>
                <PopoverContent className="w-[230px] p-1.5 border border-gray-100 shadow-xl rounded-xl bg-white" align="start" sideOffset={8}>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => setSelectedManagerId('all')}
                      className={`flex items-center justify-between w-full px-2.5 py-2 text-sm rounded-lg transition-colors outline-none ${selectedManagerId === 'all' ? 'bg-red-50 text-red-900 font-semibold' : 'text-gray-700 hover:bg-gray-50 font-medium'}`}
                    >
                      All Teams
                      {selectedManagerId === 'all' && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                    </button>
                    <div className="h-px bg-gray-100 my-0.5 mx-2" />
                    {managers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedManagerId(m.id)}
                        className={`flex items-center justify-between w-full px-2.5 py-2 text-sm rounded-lg transition-colors outline-none ${selectedManagerId === m.id ? 'bg-red-50 text-red-900 font-semibold' : 'text-gray-700 hover:bg-gray-50 font-medium'}`}
                      >
                        <span className="truncate">{m.name}'s Team</span>
                        {selectedManagerId === m.id && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 whitespace-nowrap">
                Team
              </h2>
            )}

            <button onClick={handleSyncLSQ} title="Sync LeadSquared Globally" className="ml-2 h-9 w-9 flex items-center justify-center bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors rounded-xl shrink-0">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`relative transition-opacity duration-300 mt-2 ${isHovered ? 'block opacity-100' : 'hidden opacity-0'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search team..."
            className="pl-10 rounded-xl border-gray-100 bg-white focus-visible:ring-red-600 focus-visible:ring-1 h-11 text-sm transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        <div className="flex flex-col gap-1">
          {filteredUsers.filter(u => u.role === 'executive').map(u => {
            const hasWalkIn = ongoingWalkIns[u.id];
            const trackStatus = teamTrackingStatus[u.id];
            const isSelected = selectedAssociate?.id === u.id;

            return (
              <div
                key={u.id}
                onClick={() => setSelectedAssociate(u)}
                className={`flex items-center gap-3 p-2 cursor-pointer transition-colors duration-200 rounded-xl border ${isSelected
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-900'
                  }`}
              >
                <div className={`relative shrink-0 flex items-center justify-center w-10 h-10 transition-all ${isHovered ? 'mx-0' : 'mx-auto'}`}>
                  <Avatar className="w-10 h-10 border border-gray-200">
                    <AvatarFallback className={`${isSelected ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-600 font-bold'}`}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {hasWalkIn && (
                    <div className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                    </div>
                  )}
                </div>

                <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isHovered ? 'block opacity-100' : 'hidden opacity-0'}`}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight truncate flex items-center gap-2">
                      {u.name}
                    </p>
                    {trackStatus === 'active' && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Tracking Active" />}
                    {trackStatus === 'ended' && <span className="h-2 w-2 rounded-full bg-gray-300 shrink-0" title="Tracking Ended" />}
                    {!trackStatus && <span className="h-2 w-2 rounded-full bg-gray-200 shrink-0" title="Not Started" />}
                  </div>
                  {hasWalkIn ? (
                    <p className="text-xs text-green-600 font-medium truncate mt-0.5">
                      📍 {hasWalkIn.schoolName || 'In Walk-in'}
                    </p>
                  ) : (
                    <p className={`text-xs font-medium truncate mt-0.5 ${isSelected ? 'text-red-700/70' : 'text-gray-500'}`}>
                      {u.regionId}
                    </p>
                  )}
                </div>

                <div className={`shrink-0 transition-opacity duration-300 ${isHovered ? 'block opacity-100' : 'hidden opacity-0'}`}>
                  {isSelected && <ChevronRight size={16} className="text-red-400 mr-1" />}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className={`flex-col items-center justify-center h-40 text-gray-400 ${isHovered ? 'flex' : 'hidden'}`}>
              <Search size={20} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No team members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
