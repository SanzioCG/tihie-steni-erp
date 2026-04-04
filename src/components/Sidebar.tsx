import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Wallet, ShoppingCart, Users, Banknote, 
  Package, Boxes, LogOut, ShieldCheck, Settings, Receipt, X, AlertTriangle, Calculator 
} from 'lucide-react';
import { cn } from '../utils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../supabase';
// @ts-ignore
import logo from '../asset/logo.png'; // 🟢 LOGOTIPNI IMPORT QILAMIZ

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuthStore();
  const [lowStockCount, setLowStockCount] = useState(0);

  // Kam qolgan zaxirani hisoblash
  const fetchCount = async () => {
    const { data } = await supabase.from('batches').select('remaining_quantity, min_limit');
    const count = data?.filter(b => b.remaining_quantity > 0 && b.remaining_quantity <= (b.min_limit || 0)).length || 0;
    setLowStockCount(count);
  };

  useEffect(() => {
    fetchCount();
    const ch = supabase.channel('sidebar_stock').on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => fetchCount()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const menuGroups = [
    { title: t('main_menu', 'Asosiy'), items: [
      ...(profile?.role !== 'manager' ? [{ id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') }] : []),
      { id: 'kp', icon: Calculator, label: t('kp') },
      ...(profile?.role !== 'manager' ? [{ id: 'finance', icon: Wallet, label: t('finance') }] : []),
    ]},
    { title: t('sales_crm', 'Savdo va CRM'), items: [
      { id: 'sales', icon: ShoppingCart, label: t('sales') },
      { id: 'clients', icon: Users, label: t('clients') },
      { id: 'debts', icon: Banknote, label: t('debts') },
    ]},
    { title: t('inventory_menu', 'Inventar'), items: [
      { id: 'products', icon: Package, label: t('products') },
      { id: 'stock', icon: Boxes, label: t('stock') },
      { id: 'lowstock', icon: AlertTriangle, label: t('low_stock'), badge: lowStockCount }
    ]},
    { title: t('admin_menu', 'Boshqaruv'), items: [
      ...(profile?.role !== 'manager' ? [
        { id: 'expenses', icon: Receipt, label: t('expenses') },
        { id: 'audit', icon: ShieldCheck, label: t('audit') }
      ] : []),
      { id: 'settings', icon: Settings, label: t('settings') },
    ]}
  ];

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-[#080809] border-r border-white/5 transition-all duration-300 ease-in-out flex flex-col font-sans",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="flex flex-col h-full p-6 text-left relative overflow-hidden">
        
        {/* MOBIL YOPISH TUGMASI */}
        <button onClick={() => setIsOpen(false)} className="lg:hidden absolute top-5 right-5 p-2 text-gray-500 hover:text-primary transition-colors">
          <X size={24} />
        </button>

        {/* 🟢 LOGO QISMI (ASL RASM BILAN) */}
        <div className="flex items-center gap-4 mb-12 mt-4 px-2">
          <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
            {/* Logotip orqasidagi yashil nur effekti */}
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl " />
            <div className="relative w-full h-full border border-black rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
               <img src={logo} alt="Logo" className="w-full h-full object-contain " />
            </div>
          </div>
          <div className="flex flex-col font-black tracking-widest text-white leading-tight uppercase">
            <h1 className="text-xl leading-none">ТИХИЕ</h1>
            <h1 className="text-xl leading-none mt-1">СТЕНЫ</h1>
            <p className="text-[8px] text-primary mt-1 font-black tracking-[0.3em]">UZBEKISTAN</p>
          </div>
        </div>

        {/* NAVIGATSIYA */}
        <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4 pl-3">
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
                    "flex items-center justify-between w-full p-3.5 rounded-2xl transition-all group relative mb-1",
                    activeTab === item.id 
                      ? "bg-primary text-black shadow-lg shadow-primary/20" 
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={19} className={cn(
                      "transition-transform group-hover:scale-110",
                      activeTab === item.id ? "text-black" : "group-hover:text-primary"
                    )} />
                    <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
                  </div>
                  
                  {item.badge && item.badge > 0 && (
                    <div className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-black shadow-lg">
                      {item.badge}
                    </div>
                  )}
                  
                  {activeTab === item.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-black/40 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* CHIQISH TUGMASI */}
        <div className="mt-auto pt-4 border-t border-white/5">
           <button 
             onClick={signOut}
             className="flex items-center gap-3 w-full p-4 text-gray-500 hover:text-rose-500 transition-colors group font-black text-xs uppercase tracking-widest rounded-2xl"
           >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              {t('logout')}
           </button>
        </div>
      </div>
    </div>
  );
}