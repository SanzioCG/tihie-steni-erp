import React, { useState } from 'react';
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
import Settings from './components/Settings'; // <--- 1. IMPORT QO'SHILDI
import LowStock from './components/LowStock'; // YANGI KAM QOLGANLAR COMPONENTI
import { ThemeProvider } from './components/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'products':  return <Inventory />;
      case 'stock':     return <Stock />;
      case 'lowstock':  return <LowStock />; // YANGI KAM QOLGANLAR UCHUN CASE QO'SHILDI
      case 'finance':   return <Finance />;
      case 'sales':     return <Sales />;
      case 'clients':   return <Clients />;
      case 'debts':     return <Debts />;
      case 'audit':     return <Audit />;
      case 'expenses':  return <OfficeExpenses />;
      case 'settings':  return <Settings />; // <--- 2. SOZLAMALAR UCHUN CASE QO'SHILDI
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
      <div className="min-h-screen bg-app-bg text-app-fg transition-colors duration-500 flex">
        
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
        />
        
        {/* Mobile Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-72 w-full overflow-x-hidden">
          <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="p-4 md:p-8 flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}