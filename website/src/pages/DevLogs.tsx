import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, limit, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import { Terminal, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface SystemLog {
  id: string;
  associateId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: string | null;
  timestamp: any;
  source: string;
}

export default function DevLogs() {
  const { users } = useAuthStore();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [logLimit, setLogLimit] = useState<number>(50);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to the latest logs based on the current limit
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(logLimit));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemLog[];
      
      // Reverse so newest is at the bottom like a terminal
      setLogs(fetchedLogs.reverse());
    });

    return () => unsubscribe();
  }, [logLimit]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all system logs?")) return;
    
    setIsClearing(true);
    try {
      const q = query(collection(db, 'system_logs'), limit(500));
      let snapshot = await getDocs(q);
      
      // Batch delete in chunks of 500 (Firestore limit)
      while (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        snapshot = await getDocs(q);
      }
    } catch (e) {
      console.error("Failed to clear logs", e);
    }
    setIsClearing(false);
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterUser !== 'all' && log.associateId !== filterUser) return false;
    return true;
  });

  const groupedLogs = useMemo(() => {
    const result: (SystemLog & { count: number })[] = [];
    let currentGroup: (SystemLog & { count: number }) | null = null;

    for (const log of filteredLogs) {
      if (
        currentGroup &&
        currentGroup.message === log.message &&
        currentGroup.level === log.level &&
        currentGroup.associateId === log.associateId
      ) {
        currentGroup.count += 1;
        currentGroup.timestamp = log.timestamp;
        currentGroup.metadata = log.metadata;
      } else {
        if (currentGroup) result.push(currentGroup);
        currentGroup = { ...log, count: 1 };
      }
    }
    if (currentGroup) result.push(currentGroup);
    return result;
  }, [filteredLogs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-slate-950 text-slate-300 rounded-xl overflow-hidden text-sm border border-slate-800 relative animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-slate-100 font-bold tracking-tight font-sans">Remote Dev Logs</h1>
            <p className="text-slate-500 text-xs mt-0.5">Live monitoring from production mobile clients</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-slate-300 border-none outline-none text-xs cursor-pointer font-sans"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent text-slate-300 border-none outline-none text-xs cursor-pointer max-w-[150px] truncate font-sans"
            >
              <option value="all">All Associates</option>
              {Object.values(users).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 border-r border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-400 font-sans">
              <input type="checkbox" checked={isCompact} onChange={(e) => setIsCompact(e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
              Compact
            </label>
          </div>

          <button 
            onClick={handleClearLogs}
            disabled={isClearing}
            className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-md px-3 py-1.5 shadow-sm font-medium transition-colors disabled:opacity-50 text-xs font-sans"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Clearing...' : 'Clear Logs'}
          </button>
        </div>
      </div>

      {/* Log Terminal */}
      <div className={`flex-1 overflow-y-auto p-4 relative font-mono ${isCompact ? 'space-y-0.5 text-[11px]' : 'space-y-2 text-sm'}`}>
        {logs.length >= logLimit && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={() => setLogLimit(l => l + 50)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-medium transition-colors"
            >
              Load Older Logs
            </button>
          </div>
        )}
        
        {groupedLogs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic font-sans">
            Waiting for logs...
          </div>
        ) : (
          groupedLogs.map((log) => {
            const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
            const timeStr = format(date, 'HH:mm:ss.SSS');
            const userName = users[log.associateId]?.name || log.associateId.substring(0, 8);
            
            return (
              <div key={log.id} className={`flex gap-4 hover:bg-slate-900/50 rounded transition-colors ${isCompact ? 'p-1' : 'p-1.5 px-2'}`}>
                <span className={`text-slate-600 shrink-0 ${isCompact ? 'w-[85px]' : 'w-[100px]'}`}>{timeStr}</span>
                <span className={`shrink-0 ${isCompact ? 'w-[40px]' : 'w-[50px]'} font-bold uppercase ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className={`text-slate-400 shrink-0 ${isCompact ? 'w-[100px]' : 'w-[120px]'} truncate`} title={userName}>
                  [{userName}]
                </span>
                <span className="text-slate-200 flex-1">
                  {log.count > 1 && (
                    <span className="inline-block bg-slate-800 text-slate-400 rounded px-1.5 py-0.5 mr-2 text-[10px] font-bold">
                      {log.count}x
                    </span>
                  )}
                  {log.message}
                  {log.metadata && (
                    <span className="ml-2 text-slate-500 truncate block sm:inline-block max-w-xl">
                      {log.metadata}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
