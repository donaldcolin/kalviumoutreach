import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, BarChart3, Building2, Terminal, UserCheck, Bug, Shield, Bell, Pin, PinOff, ClipboardList } from 'lucide-react';
import './App.css';
import { useAuthStore } from './stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import DevLogs from './pages/DevLogs';
import LeadRequests from './pages/LeadRequests';
import BugReport from './pages/BugReport';
import ActivityFeed from './pages/ActivityFeed';
import CRMHub from './pages/CRMHub';
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem('sidebar-pinned') === 'true');
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = isPinned || isHovered;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 350);
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem('sidebar-pinned', String(newPinned));
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navGroups = [
    {
      label: 'Core',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Team Overview', roles: ['admin', 'regionalManager', 'teamLead'] },
        { path: '/crm', icon: Building2, label: 'CRM Hub', roles: ['admin', 'regionalManager', 'teamLead'] },
        { path: '/requests', icon: UserCheck, label: 'Lead Requests', roles: ['admin', 'regionalManager', 'teamLead'] },
        { path: '/activity', icon: Bell, label: 'Activity Feed', roles: ['admin', 'regionalManager', 'teamLead'] },
      ]
    },
    {
      label: 'Insights',
      items: [
        { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'regionalManager', 'teamLead'] },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/users', icon: Shield, label: 'User Management', roles: ['admin'] },
        { path: '/logs', icon: Terminal, label: 'Dev Logs', roles: ['admin'] },
        { path: '/bug-report', icon: Bug, label: 'Report Bug', roles: ['admin', 'regionalManager', 'teamLead', 'executive'] },
      ]
    }
  ];

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-4 top-4 bottom-4 transition-all duration-300 ease-in-out bg-card border border-border rounded-[24px] shadow-card flex flex-col py-6 z-50 overflow-hidden px-3 ${isExpanded ? 'w-56' : 'w-[72px]'}`}
    >
      <div className="mb-6 w-full flex items-center h-8 relative">
        <div className="w-[48px] h-full flex items-center justify-center shrink-0 absolute left-0">
          <img src="/LOGOsmall.png" alt="Kalvium" className={`w-6 h-6 object-contain transition-opacity duration-300 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
        </div>
        <div className="h-full flex items-center shrink-0 absolute left-3">
          <img src="/LOGO.png" alt="Kalvium" className={`h-5 w-auto object-contain transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
        </div>
        
        <button onClick={togglePin} className={`absolute right-0 text-muted-foreground hover:text-foreground transition-all duration-300 p-1 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} title={isPinned ? "Unpin sidebar" : "Pin sidebar"}>
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      <div className="flex flex-col gap-6 flex-1 w-full overflow-y-auto custom-scrollbar no-scrollbar mt-2">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter(item => item.roles.includes(user?.role || 'executive'));
          if (visibleItems.length === 0) return null;
          
          return (
            <div key={groupIdx} className="flex flex-col gap-1 w-full relative">
              {isExpanded && (
                <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                  {group.label}
                </div>
              )}
              {visibleItems.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center transition-colors h-11 w-full rounded-xl group/item relative
                      ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}
                    `}
                    title={!isExpanded ? item.label : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                    )}
                    <div className="w-[48px] h-full flex items-center justify-center shrink-0">
                      <Icon size={18} className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-primary' : ''}`} />
                    </div>
                    <span className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto pr-3' : 'opacity-0 w-0 overflow-hidden'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 w-full mt-4 pt-4 border-t border-border">
        <button
          onClick={logout}
          className={`flex items-center gap-3 transition-colors h-11 w-full rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground ${isExpanded ? 'px-3 justify-start' : 'justify-center'}`}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          <span className={`whitespace-nowrap text-sm font-medium transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            Logout
          </span>
        </button>

        <div className={`flex items-center gap-3 h-11 w-full rounded-xl bg-secondary border border-border mt-1 overflow-hidden ${isExpanded ? 'px-3 justify-start' : 'justify-center'}`}>
          <div className="shrink-0 font-bold text-xs bg-card text-card-foreground w-6 h-6 rounded-md flex items-center justify-center border border-border">
            {getInitials(user?.name || '')}
          </div>
          <span className={`whitespace-nowrap text-sm font-semibold truncate transition-all duration-200 text-foreground ${isExpanded ? 'opacity-100 w-full text-left' : 'opacity-0 w-0'}`}>
            {user?.name}
          </span>
        </div>
      </div>
    </div>
  );
};

const Layout = () => (
  <div className="min-h-screen bg-white relative selection:bg-primary selection:text-white overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />
    <Sidebar />
    <main className="ml-24 p-6 relative z-10 h-screen overflow-hidden flex flex-col">
      <Outlet />
    </main>
  </div>
);

import UserManagement from './pages/admin/UserManagement';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-primary font-medium bg-background">Loading application...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="crm" element={<CRMHub />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="requests" element={<LeadRequests />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="logs" element={<ProtectedRoute allowedRoles={['admin']}><DevLogs /></ProtectedRoute>} />
          <Route path="bug-report" element={<BugReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
