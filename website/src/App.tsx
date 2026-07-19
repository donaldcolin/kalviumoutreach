import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, BarChart3, Building2, Terminal } from 'lucide-react';
import './App.css';
import { useAuthStore } from './stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Pipeline from './pages/Pipeline';
import DevLogs from './pages/DevLogs';

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
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/logs', icon: Terminal, label: 'Dev Logs' },
  ];

  return (
    <div className="fixed left-4 top-4 bottom-4 w-20 bg-card border border-border rounded-[32px] shadow-sm flex flex-col items-center py-6 z-50">
      <div className="mb-8">
        <img src="/LOGOsmall.png" alt="Kalvium" className="w-10 h-10 object-contain" />
      </div>

      <div className="flex flex-col gap-4 flex-1 items-center">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-transparent text-muted-foreground border border-border hover:bg-accent'}`}
              title={item.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 items-center">
        <button
          onClick={logout}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-transparent text-muted-foreground border border-border hover:bg-accent hover:text-destructive transition-all"
          title="Logout"
        >
          <LogOut size={20} />
        </button>

        <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm mt-2 border border-border">
          {getInitials(user?.name || '')}
        </div>
      </div>
    </div>
  );
};

const Layout = () => (
  <div className="min-h-screen bg-background relative selection:bg-primary selection:text-white">
    <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
    <Sidebar />
    <main className="ml-[104px] p-6 relative z-10 min-h-screen">
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
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<DevLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
