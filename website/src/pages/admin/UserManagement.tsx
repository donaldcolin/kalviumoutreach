import React, { useState, useMemo } from 'react';
import { useAuthStore, type User, type UserRole } from '../../stores/authStore';
import { Search, UserPlus, Shield, Users, MapPin, Eye, EyeOff, ListTree, Table } from 'lucide-react';
import { OrgChart, type OrgNode } from '../../components/admin/OrgChart';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../../components/ui/dialog';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useToast } from '../../hooks/use-toast';

export default function UserManagement() {
  const { users, addAssociate } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'orgChart'>('orgChart');

  // Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'executive' as UserRole,
    regionId: '',
    managerId: ''
  });

  const allUsers = Object.values(users);

  // Filter users for the list view
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    const lowerQ = searchQuery.toLowerCase();
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(lowerQ) ||
      u.email.toLowerCase().includes(lowerQ) ||
      u.role.toLowerCase().includes(lowerQ)
    );
  }, [allUsers, searchQuery]);

  // Derive available managers based on selected role
  const availableManagers = useMemo(() => {
    if (newUser.role === 'executive') {
      return allUsers.filter(u => u.role === 'teamLead');
    }
    if (newUser.role === 'teamLead') {
      return allUsers.filter(u => u.role === 'seniorManager');
    }
    if (newUser.role === 'seniorManager') {
      return allUsers.filter(u => u.role === 'regionalManager');
    }
    // Admin and RegionalManager do not report to anyone
    return [];
  }, [allUsers, newUser.role]);

  // Build org chart data
  const orgChartData = useMemo(() => {
    const childrenByManager = new Map<string | undefined, any[]>();
    const admins = allUsers.filter(u => u.role === 'admin');
    const unassignedAgms = allUsers.filter(u => u.role === 'regionalManager' && !u.managerId);
    
    // Pre-group by managerId (O(N))
    allUsers.forEach(u => {
      if (u.managerId) {
        if (!childrenByManager.has(u.managerId)) childrenByManager.set(u.managerId, []);
        childrenByManager.get(u.managerId)!.push(u);
      }
    });

    const buildTree = (managerId?: string, isRoot = false): OrgNode[] => {
      let children: any[] = [];
      if (isRoot) {
         children = admins.length > 0 ? admins : allUsers.filter(u => !u.managerId);
      } else {
         children = childrenByManager.get(managerId) || [];
         const manager = allUsers.find(m => m.id === managerId);
         if (manager?.role === 'admin') {
           children = [...children, ...unassignedAgms];
         }
      }

      return children.map(u => ({
        user: u,
        children: buildTree(u.id, false)
      }));
    };
    const adminNodes = buildTree(undefined, true);
    return [{
      user: {
        id: 'head-manik-madan',
        name: 'Manik Madan',
        email: 'manik.madan@kalvium.com',
        phone: '',
        role: 'headOfSales' as any,
        regionId: 'global',
        active: true
      },
      children: adminNodes
    }];
  }, [allUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userToCreate: any = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        regionId: newUser.regionId || 'global',
        active: true,
      };
      
      if (newUser.managerId) {
        userToCreate.managerId = newUser.managerId;
        
        // Compute seniorManagerId for executives reporting to team leads
        if (newUser.role === 'executive') {
           const selectedManager = users[newUser.managerId];
           if (selectedManager?.role === 'teamLead') {
             userToCreate.seniorManagerId = selectedManager.managerId || null;
           }
        }
        
        if (newUser.role === 'teamLead') {
           userToCreate.seniorManagerId = newUser.managerId;
        }
      } else {
        userToCreate.managerId = null;
        userToCreate.seniorManagerId = null;
      }

      // Ensure managerId is selected if required
      if (newUser.role !== 'admin' && newUser.role !== 'regionalManager' && !newUser.managerId) {
        toast({ title: 'Validation Error', description: 'A manager must be assigned for this role.', variant: 'destructive' });
        return;
      }

      await addAssociate(userToCreate as User, newUser.password);
      
      toast({ title: 'User Created', description: `${newUser.name} has been added successfully.` });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'executive', regionId: '', managerId: '' });
    } catch (err: any) {
      toast({ title: 'Failed to create user', description: err.message || 'Unknown error occurred.', variant: 'destructive' });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'seniorManager': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'regionalManager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'teamLead': return 'bg-green-100 text-green-700 border-green-200';
      case 'executive': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'seniorManager': return 'Senior Manager';
      case 'regionalManager': return 'AGM';
      case 'teamLead': return 'Manager';
      case 'executive': return 'Associate';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 bg-gray-50/50 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1">Manage system access, roles, and sales groups.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('orgChart')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'orgChart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListTree className="w-4 h-4" />
              Org Chart
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table className="w-4 h-4" />
              List
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-10 rounded-xl bg-white border-gray-200 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger>
              <Button className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm gap-2">
                <UserPlus className="w-4 h-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl bg-white border-0 shadow-xl">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Provision New User
                </DialogTitle>
                <DialogDescription className="text-gray-500 mt-1 font-medium">Create a new account and define their sales group.</DialogDescription>
              </div>
              
              <form onSubmit={handleAddUser} className="p-6 space-y-5 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                    <Input required placeholder="Jane Doe" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="rounded-xl h-11 bg-gray-50/50" />
                  </div>
                  
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                    <Input required type="email" placeholder="jane@kalvium.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="rounded-xl h-11 bg-gray-50/50" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone</label>
                    <Input required placeholder="+91..." value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="rounded-xl h-11 bg-gray-50/50" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Assigned Region</label>
                    <Input required placeholder="south-1" value={newUser.regionId} onChange={e => setNewUser({ ...newUser, regionId: e.target.value })} className="rounded-xl h-11 bg-gray-50/50" />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole, managerId: '' })}
                    >
                      <option value="executive">Associate (Executive)</option>
                      <option value="teamLead">Manager (Team Lead)</option>
                      <option value="seniorManager">Senior Manager</option>
                      <option value="regionalManager">AGM (Regional Manager)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {(newUser.role !== 'admin' && newUser.role !== 'regionalManager') && (
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Reports To ({newUser.role === 'executive' ? 'Manager' : 
                                    newUser.role === 'teamLead' ? 'Senior Manager' :
                                    newUser.role === 'seniorManager' ? 'AGM' : ''})
                      </label>
                      <select
                        required
                        className="flex h-11 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={newUser.managerId}
                        onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}
                      >
                        <option value="" disabled>Select a Manager</option>
                        {availableManagers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.regionId})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Temporary Password</label>
                    <div className="relative">
                      <Input required type={showPassword ? "text" : "password"} placeholder="Min 6 chars" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="rounded-xl h-11 bg-gray-50/50 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm">Provision User</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'orgChart' ? (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <OrgChart data={orgChartData} />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Sales Group (Reports To)</div>
          <div className="col-span-2">Region</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((u) => {
            const manager = u.managerId ? users[u.managerId] : null;
            return (
              <div key={u.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-gray-200 shadow-sm">
                    <AvatarFallback className="bg-red-50 text-red-700 font-bold">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getRoleColor(u.role)}`}>
                    {getRoleLabel(u.role)}
                  </span>
                </div>
                
                <div className="col-span-3 flex items-center gap-2">
                  {manager ? (
                    <>
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium truncate">{manager.name}</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium truncate">Manik Madan</span>
                    </>
                  )}
                </div>
                
                <div className="col-span-2 flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm truncate">{u.regionId}</span>
                </div>
                
                <div className="col-span-1 text-right">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${u.active ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
          
          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-gray-500 font-medium">No users found.</div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
