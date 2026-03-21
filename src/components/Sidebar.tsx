import React from 'react';
import { 
  LayoutDashboard, Wallet, ShoppingCart, Users, Banknote, 
  Package, Boxes, LogOut, ShieldCheck, Settings, Receipt 
} from 'lucide-react';
import { cn } from '../utils';

export default function Sidebar({ activeTab, setActiveTab }: any) {
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
    /* bg-app-card klassi Light modeda oq, Dark modeda qora bo'ladi */
    <div className="fixed inset-y-0 left-0 z-40 w-72 bg-app-card border-r border-app-border transition-colors duration-500">
      <div className="flex flex-col h-full p-6 text-left">
        
        {/* DINAMIK LOGO */}
        <div className="flex items-center gap-4 mb-12 mt-4 px-2">
          <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
            {/* Glow effekti - faqat dark modeda ko'proq ko'rinadi */}
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            
            {/* ТИХИЕ СТЕНЫ SVG - text-app-fg orqali rangi o'zgaradi */}
            <svg viewBox="0 0 100 100" className="relative w-full h-full fill-current text-app-fg transition-colors duration-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <rect x="22" y="20" width="12" height="60" rx="1" />
              <rect x="38" y="20" width="8" height="60" rx="1" opacity="0.8" />
              <rect x="51" y="20" width="6" height="60" rx="1" opacity="0.6" />
              <rect x="62" y="20" width="4" height="60" rx="1" opacity="0.4" />
              {/* Negative space: Bu qismlar har doim Sidebar foni bilan bir xil rangda bo'ladi */}
              <path d="M34 45c2 0 4 2 4 5s-2 5-4 5v-10z" fill="var(--app-card)" />
              <path d="M46 48c1 0 2 1 2 2.5s-1 2.5-2 2.5v-5z" fill="var(--app-card)" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-widest text-app-fg leading-none uppercase">
              ТИХИЕ
            </h1>
            <h1 className="text-xl font-black tracking-widest text-app-fg leading-tight uppercase">
              СТЕНЫ
            </h1>
            <p className="text-[8px] tracking-[0.4em] text-primary uppercase font-bold mt-1">
              UZBEKISTAN
            </p>
          </div>
        </div>

        {/* NAVIGATSIYA */}
        <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {/* Guruh sarlavhasi (text-app-muted) */}
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-[0.2em] mb-4 pl-3">
                {group.title}
              </p>
              
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
                    <span className="font-bold text-[13px] tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && (
                    <div className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-lg font-black shadow-lg">
                      {item.badge}
                    </div>
                  )}

                  {/* Faol ko'rsatkich */}
                  {activeTab === item.id && (
                    <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_15px_#34d399]" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* LOGOUT */}
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