import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, BarChart3, Building2, Terminal, UserCheck, ListTodo, Bug } from 'lucide-react';
import './App.css';
import { useAuthStore } from './stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Pipeline from './pages/Pipeline';
import UpcomingTasks from './pages/UpcomingTasks';
import DevLogs from './pages/DevLogs';
import LeadRequests from './pages/LeadRequests';
import BugReport from './pages/BugReport';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Team Overview' },
    { path: '/pipeline', icon: Building2, label: 'School Pipeline' },
    { path: '/tasks', icon: ListTodo, label: 'Upcoming Tasks' },
    { path: '/requests', icon: UserCheck, label: 'Lead Requests' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/logs', icon: Terminal, label: 'Dev Logs' },
    { path: '/bug-report', icon: Bug, label: 'Report Bug' },
  ];

  return (
    <div className="fixed left-4 top-4 bottom-4 w-16 hover:w-56 group transition-all duration-300 bg-card border border-border rounded-[32px] shadow-sm flex flex-col items-center group-hover:items-start py-6 z-50 overflow-hidden px-2 group-hover:px-4">
      <div className="mb-8 w-full flex justify-center group-hover:justify-start group-hover:pl-3 transition-all h-10 items-center">
        <img src="/LOGOsmall.png" alt="Kalvium" className="w-6 h-6 object-contain block group-hover:hidden" />
        <img src="/LOGO.png" alt="Kalvium" className="h-5 w-auto object-contain hidden group-hover:block" />
      </div>

      <div className="flex flex-col gap-3 flex-1 w-full">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-4 transition-all rounded-full h-12 w-12 group-hover:w-full justify-center group-hover:justify-start group-hover:px-4 ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-transparent text-muted-foreground border border-transparent hover:border-border hover:bg-accent'}`}
              title={item.label}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden group-hover:block whitespace-nowrap text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={logout}
          className="flex items-center gap-4 transition-all rounded-full h-12 w-12 group-hover:w-full justify-center group-hover:justify-start group-hover:px-4 bg-transparent text-muted-foreground border border-transparent hover:border-border hover:bg-accent hover:text-destructive"
          title="Logout"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="hidden group-hover:block whitespace-nowrap text-sm font-medium">Logout</span>
        </button>

        <div className="flex items-center gap-4 transition-all rounded-full h-12 w-12 group-hover:w-full justify-center group-hover:justify-start group-hover:px-4 bg-secondary text-secondary-foreground font-bold text-sm border border-border">
          <div className="shrink-0">{getInitials(user?.name || '')}</div>
          <span className="hidden group-hover:block whitespace-nowrap text-sm font-medium truncate w-full text-left">{user?.name}</span>
        </div>
      </div>
    </div>
  );
};

const Layout = () => (
  <div className="min-h-screen bg-white relative selection:bg-primary selection:text-white overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
    <Sidebar />
    <main className="ml-24 p-6 relative z-10 h-screen overflow-hidden">
      <Outlet />
    </main>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="tasks" element={<UpcomingTasks />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="requests" element={<LeadRequests />} />
          <Route path="logs" element={<DevLogs />} />
          <Route path="bug-report" element={<BugReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
