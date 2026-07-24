import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../stores/authStore';
import { CheckCircle, XCircle, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';

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

export function LeadAccessRequests() {
  const { user, users } = useAuthStore();
  const [requests, setRequests] = useState<LeadAccessRequest[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Only show for managers/admins
  const isManager = user?.role && user.role !== 'executive';

  useEffect(() => {
    if (!isManager) return;

    const q = query(collection(db, 'leadAccessRequests'));
    const unsub = onSnapshot(q, (snap) => {
      const items: LeadAccessRequest[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as LeadAccessRequest);
      });
      // Sort pending first, then by createdAt desc
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
  }, [isManager]);

  const handleApprove = async (reqId: string) => {
    try {
      setProcessing(reqId);
      await updateDoc(doc(db, 'leadAccessRequests', reqId), {
        status: 'approved',
        approvedBy: user?.id || '',
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to approve request:', err);
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
      console.error('Failed to reject request:', err);
    } finally {
      setProcessing(null);
    }
  };

  if (!isManager) return null;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Lead Access Requests</p>
            <p className="text-[11px] text-gray-400 font-medium">
              {pendingCount > 0 ? `${pendingCount} pending` : 'No pending requests'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">
              {pendingCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-100 max-h-[320px] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No access requests yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((req) => (
                <div key={req.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.leadName || 'Unknown Lead'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Requested by <span className="font-semibold">{req.requestedByName}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Owner: {req.ownerEmail}
                      </p>
                    </div>

                    {/* Status / Actions */}
                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1.5 ml-3 flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {req.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {req.status}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
