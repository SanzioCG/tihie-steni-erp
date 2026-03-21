import React from 'react';
import { 
  LayoutDashboard, Wallet, ShoppingCart, Users, Banknote, 
  Package, Boxes, LogOut, ShieldCheck, Settings, Receipt, X 
} from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const menuGroups = [
    {
      title: 'Asosiy',
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'finance', icon: Wallet, label: 'Moliya' },
      ]
    },
    {
      title: 'Savdo va CRM',
      items: [
        { id: 'sales', icon: ShoppingCart, label: 'Sotuvlar' },
        { id: 'clients', icon: Users, label: 'Mijozlar' },
        { id: 'debts', icon: Banknote, label: 'Qarzlar' },
      ]
    },
    {
      title: 'Inventar',
      items: [
        { id: 'products', icon: Package, label: 'Mahsulotlar' },
        { id: 'stock', icon: Boxes, label: 'Zaxira', badge: 4 },
      ]
    },
    {
      title: 'Boshqaruv',
      items: [
        { id: 'expenses', icon: Receipt, label: 'Office Xarajatlari' },
        { id: 'audit', icon: ShieldCheck, label: 'Audit Log' },
        { id: 'settings', icon: Settings, label: 'Sozlamalar' },
      ]
    }
  ];

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-app-card border-r border-app-border transition-all duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="flex flex-col h-full p-6 text-left relative">
        
        {/* Mobil yopish tugmasi */}
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-5 right-5 p-2 text-app-muted hover:text-primary transition-colors"
        >
          <X size={24} />
        </button>

        {/* LOGO QISMI */}
        <div className="flex items-center gap-4 mb-12 mt-4 px-2">
          <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <svg viewBox="0 0 100 100" className="relative w-full h-full fill-current text-app-fg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <rect x="22" y="20" width="12" height="60" rx="1" />
              <rect x="38" y="20" width="8" height="60" rx="1" opacity="0.8" />
              <rect x="51" y="20" width="6" height="60" rx="1" opacity="0.6" />
              <rect x="62" y="20" width="4" height="60" rx="1" opacity="0.4" />
            </svg>
          </div>
          <div className="flex flex-col font-black tracking-widest text-app-fg leading-tight uppercase">
            <h1 className="text-xl">ТИХИЕ</h1>
            <h1 className="text-xl">СТЕНЫ</h1>
            <p className="text-[8px] text-primary mt-1">UZBEKISTAN</p>
          </div>
        </div>

        {/* NAVIGATSIYA */}
        <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-[0.2em] mb-4 pl-3">
                {group.title}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-3.5 rounded-2xl transition-all group relative",
                    activeTab === item.id 
                      ? "bg-primary/10 text-primary" 
                      : "text-app-muted hover:text-app-fg hover:bg-app-fg/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={19} className={cn(
                      activeTab === item.id ? "text-primary" : "group-hover:text-primary transition-colors"
                    )} />
                    <span className="font-bold text-[13px]">{item.label}</span>
                  </div>
                  {item.badge && (
                    <div className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-lg font-black shadow-lg">
                      {item.badge}
                    </div>
                  )}
                  {activeTab === item.id && (
                    <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_15px_#34d399]" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* CHIQUVCHI TUGMA */}
        <div className="mt-auto pt-4 border-t border-app-border">
           <button className="flex items-center gap-3 w-full p-3 text-app-muted hover:text-rose-500 transition-colors group font-bold text-sm">
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Chiqish
           </button>
        </div>
      </div>
    </div>
  );
}