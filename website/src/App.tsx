import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import './App.css';
import { useAuthStore } from './stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from './components/layout/Sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Lazy loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DevLogs = lazy(() => import('./pages/DevLogs'));
const LeadRequests = lazy(() => import('./pages/LeadRequests'));
const BugReport = lazy(() => import('./pages/BugReport'));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed'));
const CRMHub = lazy(() => import('./pages/CRMHub'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const DistanceTracker = lazy(() => import('./pages/DistanceTracker'));

const PageLoader = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center">
        <img src="/LOGOsmall.png" alt="Kalvium" className="h-10 w-10 object-contain animate-pulse" />
        <div className="absolute border-[3px] border-primary/20 border-t-primary rounded-full animate-spin h-16 w-16 opacity-80" />
      </div>
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <p className="text-primary font-bold tracking-widest text-[10px] uppercase">Loading Workspace</p>
        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Establishing secure connection...</p>
      </div>
    </div>
  </div>
);

const Layout = () => (
  <div className="min-h-screen bg-white relative selection:bg-primary selection:text-white overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />
    <Sidebar />
    <main className="ml-24 p-6 relative z-10 h-screen overflow-hidden flex flex-col">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </main>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const MobileBlocker = () => (
  <div className="flex md:hidden h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
    <div className="bg-card border border-border p-8 rounded-3xl shadow-lg max-w-sm w-full flex flex-col items-center gap-4">
      <img src="/LOGO.png" alt="Kalvium" className="h-8 mb-4 object-contain" />
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
      </div>
      <h2 className="text-xl font-bold text-foreground tracking-tight">Desktop Only</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        The Kalvium CRM Dashboard is heavily optimized for desktop screens. Please open this application on your computer for the best experience.
      </p>
    </div>
  </div>
);



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false, // Don't refetch just because user switched tabs
    },
  },
});

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MobileBlocker />
      <div className="hidden md:block">
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="crm" element={<CRMHub />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="activity" element={<ActivityFeed />} />
                <Route path="requests" element={<LeadRequests />} />
                <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                <Route path="distance" element={<ProtectedRoute allowedRoles={['admin']}><DistanceTracker /></ProtectedRoute>} />
                <Route path="logs" element={<ProtectedRoute allowedRoles={['admin']}><DevLogs /></ProtectedRoute>} />
                <Route path="bug-report" element={<BugReport />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;
