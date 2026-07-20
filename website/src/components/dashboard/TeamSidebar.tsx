import React from 'react';
import { Search, ChevronRight, UserPlus, RefreshCw } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { type User } from '../../stores/authStore';

interface TeamSidebarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredUsers: User[];
  selectedAssociate: User | null;
  setSelectedAssociate: (user: User) => void;
  handleSyncLSQ: () => void;
  showAddModal: boolean;
  setShowAddModal: (val: boolean) => void;
  newAssociate: any;
  setNewAssociate: (val: any) => void;
  handleAddAssociate: (e: React.FormEvent) => void;
  ongoingWalkIns?: Record<string, any>;
  teamTrackingStatus?: Record<string, 'active' | 'ended'>;
}

export function TeamSidebar({
  searchQuery,
  setSearchQuery,
  filteredUsers,
  selectedAssociate,
  setSelectedAssociate,
  handleSyncLSQ,
  showAddModal,
  setShowAddModal,
  newAssociate,
  setNewAssociate,
  handleAddAssociate,
  ongoingWalkIns = {},
  teamTrackingStatus = {}
}: TeamSidebarProps) {
  return (
    <div className="w-[280px] flex flex-col h-full bg-white border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Team</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncLSQ} title="Sync LeadSquared Globally" className="h-8 w-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-colors rounded-xl">
              <RefreshCw size={14} />
            </button>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger className="h-8 w-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-colors rounded-xl">
                <UserPlus size={16} />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] border-zinc-200 p-0 overflow-hidden rounded-xl shadow-2xl">
                <div className="p-6 bg-zinc-900 text-white">
                  <DialogTitle className="text-xl font-medium">New Associate</DialogTitle>
                  <DialogDescription className="text-zinc-400 mt-2">Enter the details below to provision a new account.</DialogDescription>
                </div>
                <form onSubmit={handleAddAssociate} className="p-6 space-y-5 bg-white">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Name</label>
                    <Input required placeholder="John Doe" value={newAssociate.name} onChange={e => setNewAssociate({ ...newAssociate, name: e.target.value })} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</label>
                    <Input required type="email" placeholder="john@kalvium.com" value={newAssociate.email} onChange={e => setNewAssociate({ ...newAssociate, email: e.target.value })} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone</label>
                    <Input required placeholder="+91 9876543210" value={newAssociate.phone} onChange={e => setNewAssociate({ ...newAssociate, phone: e.target.value })} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Assigned Area</label>
                    <Input required placeholder="e.g. south-1, north-east" value={newAssociate.regionId} onChange={e => setNewAssociate({ ...newAssociate, regionId: e.target.value })} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Temporary Password</label>
                    <Input required type="password" placeholder="Min 6 characters" value={newAssociate.password} onChange={e => setNewAssociate({ ...newAssociate, password: e.target.value })} className="rounded-xl border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11" />
                  </div>
                  <Button type="submit" className="w-full mt-8 rounded-xl bg-zinc-900 text-white hover:bg-black h-11 text-sm font-medium tracking-wide uppercase">Create Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search team..."
            className="pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-zinc-900 focus-visible:ring-1 h-11 text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3">
          {filteredUsers.filter(u => u.role === 'executive').map(u => {
            const hasWalkIn = ongoingWalkIns[u.id];
            const trackStatus = teamTrackingStatus[u.id];

            return (
              <div
                key={u.id}
                onClick={() => setSelectedAssociate(u)}
                className={`flex items-center gap-4 p-3 mb-1 cursor-pointer transition-all rounded-xl ${selectedAssociate?.id === u.id ? 'bg-zinc-900 text-white shadow-md translate-x-1' : 'hover:bg-zinc-50 text-zinc-900'}`}
              >
                <div className="relative">
                  <div className={`h-10 w-10 flex items-center justify-center text-sm font-semibold rounded-full ${selectedAssociate?.id === u.id ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  {hasWalkIn && (
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      {u.name}
                    </p>
                    {trackStatus === 'active' && <span className="h-2 w-2 rounded-full bg-green-500" title="Tracking Active" />}
                    {trackStatus === 'ended' && <span className="h-2 w-2 rounded-full bg-red-500" title="Tracking Ended" />}
                    {!trackStatus && <span className="h-2 w-2 rounded-full bg-zinc-300" title="Not Started" />}
                  </div>
                  {hasWalkIn ? (
                    <p className="text-[11px] text-green-500 font-medium truncate mt-0.5">
                      📍 {hasWalkIn.schoolName || 'In Walk-in'}
                    </p>
                  ) : (
                    <p className={`text-[11px] truncate mt-0.5 ${selectedAssociate?.id === u.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {u.regionId}
                    </p>
                  )}
                </div>
                {selectedAssociate?.id === u.id && <ChevronRight size={16} className={selectedAssociate?.id === u.id ? "text-zinc-400 mr-1" : "text-zinc-300"} />}
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
              <Search size={24} className="mb-2 opacity-20" />
              <p className="text-sm">No associates found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
