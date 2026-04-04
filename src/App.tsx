import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Stock from './components/Stock';
import Finance from './components/Finance';
import Sales from './components/Sales';
import Clients from './components/Clients';
import Debts from './components/Debts';
import Audit from './components/Audit';
import OfficeExpenses from './components/OfficeExpenses';
import Settings from './components/Settings';
import LowStock from './components/LowStock';
import KP from './components/KP';
import Login from './components/Login'; 
import { useAuthStore } from './store/useAuthStore'; 
import { ThemeProvider } from './components/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, profile, loading, checkUser } = useAuthStore(); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // 🟢 Faqat birinchi marta loadingni ko'rsatish uchun 'true' yuboramiz
    checkUser(true); 
  }, []);

  const renderContent = () => {
    const role = profile?.role;
    // Manager Dashboardni ko'rolmasligi uchun redirect
    const currentTab = (role === 'manager' && activeTab === 'dashboard') ? 'kp' : activeTab;

    switch (currentTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'kp':        return <KP />;
      case 'products':  return <Inventory />;
      case 'stock':     return <Stock />;
      case 'lowstock':  return <LowStock />;
      case 'finance':   return <Finance />;
      case 'sales':     return <Sales />;
      case 'clients':   return <Clients />;
      case 'debts':     return <Debts />;
      case 'audit':     return <Audit />;
      case 'expenses':  return <OfficeExpenses />;
      case 'settings':  return <Settings />;
      default: return <Inventory />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#080809] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">TS ERP Yuklanmoqda</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <div className="min-h-screen bg-app-bg text-app-fg flex relative font-sans">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" />
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-screen lg:ml-72 w-full overflow-x-hidden">
          <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="p-4 md:p-8 flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}