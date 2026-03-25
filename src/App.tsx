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
import { ThemeProvider } from './components/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Xatolik tuzatildi: qo'shtirnoq ichidagi matn to'g'irlandi
    if (outcome === 'accepted') {
      console.log("PWA o'rnatildi"); 
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
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
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
      <div className="min-h-screen bg-app-bg text-app-fg transition-colors duration-500 flex relative">
        
        {/* PWA INSTALL BANNER */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-9999"
            >
              <div className="bg-[#0c0c0e] border border-white/10 p-4 rounded-4xl shadow-2xl backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Download size={24} />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-black uppercase italic tracking-tighter">TS ERP System</h4>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest text-left">Ilovani o'rnatish</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowInstallBanner(false)} className="p-2 text-gray-600 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                  <button 
                    onClick={handleInstallClick}
                    className="px-6 py-3 bg-[#86efac] text-black text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-all shadow-lg"
                  >
                    O'rnatish
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            />
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