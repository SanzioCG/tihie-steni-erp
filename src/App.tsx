import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Stock from './components/Stock'; // Yangi import
import Finance from './components/Finance';
import Sales from './components/Sales';
import Clients from './components/Clients';
import Debts from './components/Debts';
import Audit from './components/Audit';
import { exportToPDF } from './utils';
import OfficeExpenses from './components/OfficeExpenses'; // Yangi import
import { ThemeProvider } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ca } from 'zod/v4/locales';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'products':  return <Inventory />; // Mahsulotlar Katalogi
      case 'stock':     return <Stock />;     // Ombor Zaxirasi
      case 'finance':   return <Finance />;
      case 'sales':     return <Sales />;
      case 'clients':   return <Clients />;   // Mijozlar Bo'limi
      case 'debts':     return <Debts />;     // Qarzlar Bo'limi
      case 'audit':     return <Audit />;
      case 'expenses':  return <OfficeExpenses />; // Office Xarajatlari
      default:          return <Dashboard />;
    }
  };

  return (
    // @ts-ignore
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
      <div className="min-h-screen bg-app-bg text-app-fg transition-colors duration-500">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="lg:ml-72 flex flex-col min-h-screen">
          <TopBar />
          <main className="p-8 flex-1 relative">
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