import { useEffect } from 'react';
import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Stock from './pages/Stock';
import Finance from './pages/Finance';
import Sales from './pages/Sales';
import Clients from './pages/Clients';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Debts from './pages/Debts';
import Audit from './pages/Audit';
import OfficeExpenses from './pages/OfficeExpenses';
import Settings from './pages/Settings';
import LowStock from './pages/LowStock';
import KP from './pages/KP';
import Login from './pages/Login';
import ReloadPrompt from './components/ui/ReloadPrompt';
import { useAuthStore } from './store/useAuthStore';
import { ThemeProvider } from './components/layout/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { subscribeUserToPush, getNotificationPermission, isPushSupported } from './lib/pushNotifications';

export default function App() {
  const { user, profile, loading, checkUser } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkUser(true);
  }, []);

  // Push notification subscribe (faqat admin/director uchun)
  useEffect(() => {
    if (user && profile && (profile.role === 'admin' || profile.role === 'director')) {
      if (isPushSupported() && getNotificationPermission() !== 'denied') {
        const timer = setTimeout(() => {
          subscribeUserToPush(user.id).then(success => {
            if (success) console.log('✅ Push notifications yoqildi');
          });
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="h-screen bg-[#080809] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-white text-[10px] font-bold uppercase tracking-wide">TS ERP Yuklanmoqda</p>
      </div>
    );
  }

  if (!user) return <Login />;

  // Manager uchun dashboard cheklash — default route'ni belgilash
  const defaultRoute = profile?.role === 'manager' ? '/kp' : '/dashboard';

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: { background: '#121214', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' } 
        }} 
      />

      <ReloadPrompt />

      <div className="min-h-screen bg-app-bg text-app-fg flex relative font-sans">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" />
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-screen lg:ml-72 w-full overflow-x-hidden">
          <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="p-4 md:p-8 flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <Routes>
                  <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                  <Route path="/dashboard" element={profile?.role === 'manager' ? <Navigate to="/kp" replace /> : <Dashboard />} />
                  <Route path="/kp" element={<KP />} />
                  <Route path="/products" element={<Inventory />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/lowstock" element={<LowStock />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/debts" element={<Debts />} />
                  <Route path="/audit" element={<Audit />} />
                  <Route path="/expenses" element={<OfficeExpenses />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to={defaultRoute} replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}