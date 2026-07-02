import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, Flame, LogOut } from 'lucide-react';
import './App.css';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/verification', icon: CheckCircle, label: 'Verification' },
  ];

  return (
    <div className="fixed left-4 top-4 bottom-4 w-20 bg-card border border-border rounded-[32px] shadow-sm flex flex-col items-center py-6 z-50">
      <div className="mb-8">
        <Flame size={28} className="text-primary" />
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

const Verification = () => (
  <div className="animate-in fade-in duration-500">
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Visit Verification</h1>
    </div>
    <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Pending Verifications (0)</h3>
      <p className="text-muted-foreground">All visits have been verified.</p>
    </div>
  </div>
);

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
          <Route path="verification" element={<Verification />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
