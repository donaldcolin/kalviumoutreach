import React, { useState } from 'react';
import { Search, ChevronRight, UserPlus, RefreshCw, Users, Eye, EyeOff } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
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
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="group w-20 hover:w-64 transition-all duration-300 ease-in-out z-50 flex flex-col h-full bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden shrink-0">
      <div className="p-4 flex flex-col gap-4 border-b border-gray-100 shrink-0">
        <div className="flex flex-col relative min-h-[40px]">
          {/* CLOSED STATE */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-100 group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-300">
             <div className="flex flex-col items-center gap-1.5 text-gray-400 mt-2">
               <Users className="w-6 h-6" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Team</span>
             </div>
          </div>
          
          {/* EXPANDED STATE HEADER */}
          <div className="w-full flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <h2 className="text-xl font-semibold tracking-tight text-gray-900 whitespace-nowrap">
               Team
             </h2>
             <div className="flex items-center gap-1">
                <button onClick={handleSyncLSQ} title="Sync LeadSquared Globally" className="h-9 w-9 flex items-center justify-center bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors rounded-xl shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger className="h-9 w-9 flex items-center justify-center bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors rounded-xl shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px] border-gray-100 p-0 overflow-hidden rounded-xl shadow-sm bg-white">
                    <div className="p-6 border-b border-gray-100 bg-white">
                      <DialogTitle className="text-xl font-semibold text-gray-900 tracking-tight">New Associate</DialogTitle>
                      <DialogDescription className="text-gray-500 mt-2 text-sm font-medium">Enter the details below to provision a new account.</DialogDescription>
                    </div>
                    <form onSubmit={handleAddAssociate} className="p-6 space-y-4 bg-white">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Name</label>
                        <Input required placeholder="John Doe" value={newAssociate.name} onChange={e => setNewAssociate({ ...newAssociate, name: e.target.value })} className="rounded-xl border-gray-100 focus-visible:ring-red-600 focus-visible:ring-1 h-11 shadow-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label>
                        <Input required type="email" placeholder="john@kalvium.com" value={newAssociate.email} onChange={e => setNewAssociate({ ...newAssociate, email: e.target.value })} className="rounded-xl border-gray-100 focus-visible:ring-red-600 focus-visible:ring-1 h-11 shadow-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</label>
                        <Input required placeholder="+91 9876543210" value={newAssociate.phone} onChange={e => setNewAssociate({ ...newAssociate, phone: e.target.value })} className="rounded-xl border-gray-100 focus-visible:ring-red-600 focus-visible:ring-1 h-11 shadow-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assigned Area</label>
                        <Input required placeholder="e.g. south-1, north-east" value={newAssociate.regionId} onChange={e => setNewAssociate({ ...newAssociate, regionId: e.target.value })} className="rounded-xl border-gray-100 focus-visible:ring-red-600 focus-visible:ring-1 h-11 shadow-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Temporary Password</label>
                        <div className="relative">
                          <Input required type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={newAssociate.password} onChange={e => setNewAssociate({ ...newAssociate, password: e.target.value })} className="rounded-xl border-gray-100 focus-visible:ring-red-600 focus-visible:ring-1 h-11 shadow-sm pr-10" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full mt-6 rounded-xl bg-red-600 text-white hover:bg-red-700 h-11 text-sm font-medium tracking-wide shadow-sm">Create Account</Button>
                    </form>
                  </DialogContent>
                </Dialog>
             </div>
          </div>
        </div>
        
        <div className="relative hidden opacity-0 group-hover:block group-hover:opacity-100 transition-opacity duration-300 mt-2">
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
                className={`flex items-center gap-3 p-2 cursor-pointer transition-colors duration-200 rounded-xl border ${
                  isSelected 
                    ? 'bg-red-50 border-red-200 text-red-900' 
                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-900'
                }`}
              >
                <div className="relative shrink-0 flex items-center justify-center w-10 h-10 mx-auto group-hover:mx-0">
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
                
                <div className="hidden opacity-0 group-hover:block group-hover:opacity-100 flex-1 min-w-0 transition-opacity duration-300">
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
                
                <div className="hidden opacity-0 group-hover:block group-hover:opacity-100 shrink-0 transition-opacity duration-300">
                  {isSelected && <ChevronRight size={16} className="text-red-400 mr-1" />}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 hidden group-hover:flex">
              <Search size={20} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No team members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

