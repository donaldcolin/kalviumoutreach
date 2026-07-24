import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { CheckCircle, XCircle, Clock, Users, Search } from 'lucide-react';

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leadAccessRequests'), (snap) => {
      const items: LeadAccessRequest[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as LeadAccessRequest);
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
  }, []);

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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock, label: 'Pending' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: XCircle, label: 'Rejected' },
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col gap-6 p-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Access Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage lead sharing across your team</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-500 font-medium">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              <p className="text-xs text-gray-500 font-medium">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
              <p className="text-xs text-gray-500 font-medium">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by school name, associate, or owner..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
                filterStatus === s 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm">No requests found</p>
            </div>
          </div>
        ) : (
          filtered.map((req) => {
            const config = statusConfig[req.status];
            const StatusIcon = config.icon;
            const approver = req.approvedBy ? Object.values(users).find(u => u.id === req.approvedBy) : null;

            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{req.leadName || 'Unknown Lead'}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mt-3">
                      <div>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Requested By</p>
                        <p className="text-sm text-gray-700 font-medium">{req.requestedByName}</p>
                        <p className="text-xs text-gray-400">{req.requestedByEmail}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Current Owner</p>
                        <p className="text-sm text-gray-700 font-medium">{req.ownerEmail}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Requested On</p>
                        <p className="text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                      </div>
                      {approver && (
                        <div className="mt-2">
                          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                            {req.status === 'approved' ? 'Approved By' : 'Rejected By'}
                          </p>
                          <p className="text-xs text-gray-500">{approver.name} · {formatDate(req.approvedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 ml-6 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processing === req.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processing === req.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-600 text-sm font-semibold border border-red-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
