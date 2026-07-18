import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ShoppingCart, Users, Banknote,
  Package, Boxes, LogOut, ShieldCheck, Settings, Receipt, X, AlertTriangle, Calculator, CalendarClock, GitBranch
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../services/supabase';
// @ts-ignore
import logo from '../../asset/logo.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [lowStockCount, setLowStockCount] = useState(0);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'director';

  // Hozirgi URL'ga qarab active tab ni aniqlash
  const activeTab = location.pathname.replace('/', '') || 'dashboard';

  const handleNavigate = (path: string) => {
    navigate(`/${path}`);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  // Kam qolgan zaxirani hisoblash
  const fetchCount = async () => {
    const { data } = await supabase.from('batches').select('remaining_quantity, min_limit');
    const count = data?.filter(b => Number(b.remaining_quantity) <= Number(b.min_limit || 0)).length || 0;
    setLowStockCount(count);
  };

useEffect(() => {
  fetchCount();
  
  let timeout: any;
  const debouncedFetch = () => {
    clearTimeout(timeout);
    timeout = setTimeout(fetchCount, 2000); // 2 sekund kutadi
  };
  
  const ch = supabase
    .channel('sidebar_stock')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, debouncedFetch)
    .subscribe();
    
  return () => { 
    clearTimeout(timeout);
    supabase.removeChannel(ch); 
  };
}, []);

  const menuGroups = [
    {
      title: t('main_menu', 'Asosiy'),
      items: [
        ...(isAdmin ? [{ id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') }] : []),
        ...(isAdmin ? [{ id: 'finance', icon: Wallet, label: t('finance') }] : []),
      ]
    },
    {
      title: t('sales_crm', 'Savdo va CRM'),
      items: [
        { id: 'deals', icon: GitBranch, label: t('deals_funnel') },
        { id: 'sales', icon: ShoppingCart, label: t('sales') },
        { id: 'kp', icon: Calculator, label: t('kp') },
        { id: 'clients', icon: Users, label: t('clients') },
        { id: 'tasks', icon: CalendarClock, label: t('tasks') },
        { id: 'debts', icon: Banknote, label: t('debts') },
      ]
    },
    {
      title: t('inventory_menu', 'Ombor'),
      items: [
        { id: 'products', icon: Package, label: t('products') },
        { id: 'stock', icon: Boxes, label: t('stock') },
        { id: 'lowstock', icon: AlertTriangle, label: t('low_stock'), badge: lowStockCount }
      ]
    },
    {
      title: t('admin_menu', 'Boshqaruv'),
      items: [
        ...(isAdmin ? [
          { id: 'expenses', icon: Receipt, label: t('expenses') },
          { id: 'audit', icon: ShieldCheck, label: t('audit') }
        ] : []),
        { id: 'settings', icon: Settings, label: t('settings') },
      ]
    }
  ].filter(g => g.items.length > 0);

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-[#080809] border-r border-white/5 transition-all duration-300 ease-in-out flex flex-col font-sans",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="flex flex-col h-full p-5 text-left relative overflow-hidden">
        <button onClick={() => setIsOpen(false)} className="lg:hidden absolute top-5 right-5 p-2 text-gray-500 hover:text-primary transition-colors"><X size={24} /></button>

        {/* LOGO */}
        <div className="flex items-center gap-3 mb-6 mt-2 px-2">
          <div className="relative shrink-0 w-11 h-11">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full border border-white/5 rounded-xl overflow-hidden shadow-2xl">
               <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex flex-col font-black tracking-widest text-white leading-tight uppercase">
            <h1 className="text-base leading-none">ТИХИЕ</h1>
            <h1 className="text-base leading-none mt-0.5">СТЕНЫ</h1>
            <p className="text-[8px] text-primary mt-1 font-black tracking-[0.3em]">ERP SYSTEM</p>
          </div>
        </div>

        {/* NAVIGATSIYA */}
        <nav className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-2 pb-6">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-0.5">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 pl-3">{group.title}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "flex items-center justify-between w-full py-2.5 px-3 rounded-xl transition-all group",
                    activeTab === item.id ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={17} className={cn("transition-transform group-hover:scale-110 shrink-0", activeTab === item.id ? "text-black" : "group-hover:text-primary")} />
                    <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && <div className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-black shadow-lg">{item.badge}</div>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* FOOTER: USER INFO & LOGOUT */}
        <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
           <div className="px-3 py-3 bg-white/3 border border-white/5 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <div className="flex flex-col">
                 <span className="text-[11px] font-black text-white uppercase tracking-tight">{profile?.full_name}</span>
                 <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{profile?.role}</span>
              </div>
           </div>

           <button
             onClick={signOut}
             className="flex items-center gap-3 w-full p-3 text-gray-500 hover:text-rose-500 transition-all group font-black text-[10px] uppercase tracking-widest rounded-xl bg-white/2 border border-white/5"
           >
              <LogOut size={18} className="text-rose-500/70 group-hover:text-rose-500 transition-colors" /> 
              {t('logout')}
           </button>
        </div>
      </div>
    </div>
  );
}