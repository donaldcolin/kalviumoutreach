import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { AnalyticsTab } from '../components/AnalyticsTab';
import { BarChart3 } from 'lucide-react';
import { GlobalDataFilter } from '../components/GlobalDataFilter';

export default function Analytics() {
  const { users, user } = useAuthStore();
  const [globalActivities7Days, setGlobalActivities7Days] = useState<any[]>([]);

  // Shared Filter State
  const [managerFilter, setManagerFilter] = useState('all');
  const [associateFilter, setAssociateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(''); // Used if AnalyticsTab gets updated later
  const [dateFilter, setDateFilter] = useState('');

  // Compute available managers based on RBAC
  const availableManagers = useMemo(() => {
    return Object.values(users).filter(u => u.role === 'teamLead');
  }, [users]);

  const visibleUsers = useMemo(() => {
    let vUsers = Object.values(users).filter(u => u.role === 'executive');
    
    if (managerFilter !== 'all') {
      vUsers = vUsers.filter(u => u.managerId === managerFilter);
    }
    
    if (associateFilter !== 'all') {
      vUsers = vUsers.filter(u => u.email?.toLowerCase() === associateFilter);
    }
    
    return vUsers;
  }, [users, managerFilter, associateFilter]);

  const visibleEmails = useMemo(() => {
    return new Set(visibleUsers.map((u: any) => u.email?.toLowerCase()).filter(Boolean));
  }, [visibleUsers]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch last 7 days of CRM activities for Analytics tab
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTs = sevenDaysAgo.getTime();
    
    // We will use 'syncedAt' or 'lsqCreatedOn' to limit the fetch. 
    // Since 'syncedAt' is a Firebase Timestamp, we should use 'lsqCreatedOn' (ISO string) 
    // as it covers both app-created and LSQ-synced records consistently.
    const sevenDaysAgoIsoString = sevenDaysAgo.toISOString();
    const q7 = query(
      collection(db, 'crmActivities'),
      where('lsqCreatedOn', '>=', sevenDaysAgoIsoString)
    );
    
    const unsub7 = onSnapshot(q7, (snapshot) => {
      const activities = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const filtered = activities.filter(a => {
        const dt = a.walkInDateTime || a.lsqCreatedOn;
        if (!dt) return false;
        
        // RBAC check
        const email = a.executiveEmail?.toLowerCase();
        if (user?.role !== 'admin' && (!email || !visibleEmails.has(email))) return false;

        return new Date(dt).getTime() >= sevenDaysAgoTs;
      });
      setGlobalActivities7Days(filtered);
      setIsLoading(false);
    });
    
    return () => unsub7();
  }, [user?.role, visibleEmails]);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-6 bg-transparent text-gray-900 animate-in fade-in duration-700">
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <BarChart3 className="w-5 h-5 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Analytics & Reports
          </h1>
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
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnalyticsTab 
          users={visibleUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>)} 
          globalActivities={globalActivities7Days}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
