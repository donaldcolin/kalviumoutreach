import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { CheckCircle, XCircle, Clock, Users, Search } from 'lucide-react';
import { GlobalDataFilter } from '../components/GlobalDataFilter';
import { EmptyState } from '../components/ui/EmptyState';

interface LeadAccessRequest {
  id: string;
  leadId: string;
  leadName: string;
  ownerEmail: string;
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  approvedBy?: string;
  approvedAt?: any;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function LeadRequests() {
  const { user, users } = useAuthStore();
  const [requests, setRequests] = useState<LeadAccessRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Shared Filter State
  const [managerFilter, setManagerFilter] = useState('all');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(''); // Unused here but required for GlobalDataFilter

  // Compute available managers based on RBAC
  const availableManagers = useMemo(() => {
    if (!user) return [];
    const allUsers = Object.values(users);
    if (user.role === 'admin') return allUsers.filter(u => u.role === 'teamLead');
    if (user.role === 'regionalManager') return allUsers.filter(u => u.role === 'teamLead' && u.managerId === user.id);
    return [];
  }, [user, users]);

  // Get visible users based on RBAC hierarchy and Manager Filter
  const visibleEmails = useMemo(() => {
    if (!user) return new Set();
    const allUsers = Object.values(users);
    let visibleUsers: any[] = [];
    
    if (user.role === 'admin' || user.role === 'regionalManager') {
      if (managerFilter !== 'all') {
        visibleUsers = allUsers.filter(u => u.role === 'executive' && u.managerId === managerFilter);
      } else {
        if (user.role === 'admin') {
          visibleUsers = allUsers;
        } else {
          const myManagerIds = new Set(availableManagers.map(m => m.id));
          const myExecutives = allUsers.filter(u => u.role === 'executive' && u.managerId && myManagerIds.has(u.managerId));
          visibleUsers = [...availableManagers, ...myExecutives, user];
        }
      }
    } else if (user.role === 'teamLead') {
      visibleUsers = allUsers.filter(u => u.managerId === user.id || u.id === user.id);
    }
    return new Set(visibleUsers.map(u => u.email?.toLowerCase()).filter(Boolean));
  }, [users, user, managerFilter, availableManagers]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leadAccessRequests'), (snap) => {
      const items: LeadAccessRequest[] = [];
      snap.forEach((d) => {
        const data = d.data() as LeadAccessRequest;
        // Apply RBAC check
        if (user?.role !== 'admin' && (!data.requestedByEmail || !visibleEmails.has(data.requestedByEmail.toLowerCase()))) {
          return;
        }
        items.push({ ...data, id: d.id });
      });
      // Sort: pending first, then by createdAt desc
      items.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const aTs = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bTs = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bTs - aTs;
      });
      setRequests(items);
    });
    return unsub;
  }, [user, visibleEmails]);

  const handleApprove = async (reqId: string) => {
    try {
      setProcessing(reqId);
      await updateDoc(doc(db, 'leadAccessRequests', reqId), {
        status: 'approved',
        approvedBy: user?.id || '',
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      setProcessing(reqId);
      await updateDoc(doc(db, 'leadAccessRequests', reqId), {
        status: 'rejected',
        approvedBy: user?.id || '',
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + 
      ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter and search
  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (associateFilter !== 'all' && r.requestedByEmail?.toLowerCase() !== associateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (r.leadName || '').toLowerCase().includes(q) ||
        (r.requestedByName || '').toLowerCase().includes(q) ||
        (r.requestedByEmail || '').toLowerCase().includes(q) ||
        (r.ownerEmail || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Count variables removed to fix TS unused errors

  const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock, label: 'Pending' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: XCircle, label: 'Rejected' },
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col gap-6 p-6 animate-in fade-in duration-700 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lead Access Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage lead sharing across your team</p>
        </div>
        <GlobalDataFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          associateFilter={associateFilter}
          setAssociateFilter={setAssociateFilter}
          executives={Object.values(users).filter(u => u.role === 'executive')}
          managerFilter={managerFilter}
          setManagerFilter={setManagerFilter}
          managers={availableManagers}
          userRole={user?.role}
        />
      </div>


      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by school name, associate, or owner..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all uppercase tracking-wider ${
                filterStatus === s 
                  ? 'bg-foreground text-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {filtered.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No requests found"
            description="There are currently no lead access requests matching your filters."
          />
        ) : (
          filtered.map((req) => {
            const config = statusConfig[req.status];
            const approver = req.approvedBy ? Object.values(users).find(u => u.id === req.approvedBy) : null;

            return (
              <div key={req.id} className="bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all group hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base font-semibold text-foreground tracking-tight truncate">{req.leadName || 'Unknown Lead'}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium ml-2">{formatDate(req.createdAt)}</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border">
                          {req.requestedByName ? req.requestedByName.substring(0,2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Requested By</p>
                          <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{req.requestedByName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border">
                          {req.ownerEmail ? req.ownerEmail.substring(0,2).toUpperCase() : 'O'}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current Owner</p>
                          <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{req.ownerEmail}</p>
                        </div>
                      </div>
                      
                      {approver && (
                        <div className="flex items-center gap-2 ml-auto">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider text-right">
                              {req.status === 'approved' ? 'Approved By' : 'Rejected By'}
                            </p>
                            <p className="text-xs font-medium text-foreground text-right">{approver.name} · {formatDate(req.approvedAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-6 shrink-0 justify-center">
                    {req.status === 'pending' && user?.role === 'admin' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="px-4 py-2 text-sm font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                          className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {processing === req.id ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
