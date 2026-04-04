import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Wallet, ShoppingCart, Users, Banknote, 
  Package, Boxes, LogOut, ShieldCheck, Settings, Receipt, X, AlertTriangle, Calculator 
} from 'lucide-react';
import { cn } from '../utils';
import { useTranslation } from 'react-i18next'; // Hookni import qilamiz
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../supabase';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: any) {
  const { t } = useTranslation(); // 🟢 t funksiyasini chaqiramiz
  const { profile, signOut } = useAuthStore();
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.from('batches').select('remaining_quantity, min_limit');
      const count = data?.filter(b => b.remaining_quantity > 0 && b.remaining_quantity <= (b.min_limit || 0)).length || 0;
      setLowStockCount(count);
    };
    fetchCount();
  }, []);

  // 🟢 MUHIM: menuGroups funksiya ichida bo'lishi shart! 
  // Shunda til o'zgarganda 't' funksiyasi yangi so'zlarni qayta hisoblaydi.
  const menuGroups = [
    {
      title: t('main_menu'), // i18n: Asosiy
      items: [
        ...(profile?.role !== 'manager' ? [{ id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') }] : []),
        { id: 'kp', icon: Calculator, label: t('kp') },
        ...(profile?.role !== 'manager' ? [{ id: 'finance', icon: Wallet, label: t('finance') }] : []),
      ]
    },
    {
      title: t('sales_crm'), // i18n: Savdo va CRM
      items: [
        { id: 'sales', icon: ShoppingCart, label: t('sales') },
        { id: 'clients', icon: Users, label: t('clients') },
        { id: 'debts', icon: Banknote, label: t('debts') },
      ]
    },
    {
      title: t('inventory_menu'), // i18n: Inventar
      items: [
        { id: 'products', icon: Package, label: t('products') },
        { id: 'stock', icon: Boxes, label: t('stock') },
        { id: 'lowstock', icon: AlertTriangle, label: t('low_stock'), badge: lowStockCount }
      ]
    },
    {
      title: t('admin_menu'), // i18n: Boshqaruv
      items: [
        ...(profile?.role !== 'manager' ? [
          { id: 'expenses', icon: Receipt, label: t('expenses') },
          { id: 'audit', icon: ShieldCheck, label: t('audit') }
        ] : []),
        { id: 'settings', icon: Settings, label: t('settings') },
      ]
    }
  ];

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-app-card border-r border-app-border transition-all duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="flex flex-col h-full p-6 text-left relative font-sans">
        
        {/* LOGO */}
        <div className="flex items-center gap-4 mb-12 mt-4 px-2">
          <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <svg viewBox="0 0 100 100" className="relative w-full h-full fill-current text-app-fg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <rect x="22" y="20" width="12" height="60" rx="1" /><rect x="38" y="20" width="8" height="60" rx="1" opacity="0.8" />
              <rect x="51" y="20" width="6" height="60" rx="1" opacity="0.6" /><rect x="62" y="20" width="4" height="60" rx="1" opacity="0.4" />
            </svg>
          </div>
          <div className="flex flex-col font-black tracking-widest text-app-fg uppercase leading-tight">
            <h1 className="text-xl leading-none">ТИХИЕ</h1>
            <h1 className="text-xl leading-none mt-1">СТЕНЫ</h1>
            <p className="text-[8px] text-primary mt-1 font-black">UZBEKISTAN</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-[10px] font-black text-app-muted uppercase tracking-[0.2em] mb-4 pl-3">
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
                    <item.icon size={19} className={activeTab === item.id ? "text-primary" : ""} />
                    <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <div className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-black shadow-lg">
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

        <button onClick={signOut} className="mt-auto pt-4 border-t border-app-border flex items-center gap-3 w-full p-3 text-app-muted hover:text-rose-500 transition-colors group font-black text-xs uppercase tracking-widest">
           <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
           {t('logout')}
        </button>
      </div>
    </div>
  );
}