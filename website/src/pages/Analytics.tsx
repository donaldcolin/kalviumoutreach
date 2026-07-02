import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { AnalyticsTab } from '../components/AnalyticsTab';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  const { users } = useAuthStore();
  const [globalVisits7Days, setGlobalVisits7Days] = useState<any[]>([]);

  useEffect(() => {
    // Fetch last 7 days of visits for Analytics tab
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q7 = query(collection(db, 'visits'), where('timestamp', '>=', sevenDaysAgo.getTime()));
    
    const unsub7 = onSnapshot(q7, (snapshot) => {
      const visits = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setGlobalVisits7Days(visits);
    });
    
    return () => unsub7();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-6 p-6 bg-[#fafafa] text-zinc-900 animate-in fade-in duration-700">
      <div className="flex items-center gap-3 shrink-0 mb-2">
        <div className="p-2 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <BarChart3 className="w-5 h-5 text-zinc-900" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Analytics & Reports
        </h1>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnalyticsTab users={users} globalVisits={globalVisits7Days} />
      </div>
    </div>
  );
}
