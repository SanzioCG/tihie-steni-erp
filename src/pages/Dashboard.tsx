import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  TrendingUp, AlertTriangle, Activity, ShoppingBag, 
  History, Wallet, Loader2, Calendar, FileText, X 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore'; 
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalRevenue: number;
  inventoryValue: number;
  totalDebts: number;
  lowStockCount: number;
  chartData: { day: string, total: number }[];
  recentActivity: any[];
}

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency, fetchRates, convert, rates } = useCurrencyStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Z-REPORT STATES
  const [showZReport, setShowZReport] = useState(false);
  const [zData, setZData] = useState<any>(null);

  // ASOSIY MA'LUMOTLARNI YUKLASH
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      fetchRates(); // Valyuta kurslarini fonda yangilaymiz

      // Barcha statistikani bitta RPC so'rovda olamiz
      const { data: dbStats, error: rpcErr } = await supabase.rpc('get_dashboard_stats');
      if (rpcErr) throw rpcErr;
      
      // Oxirgi loglarni olamiz
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      setStats({
        ...dbStats,
        recentActivity: logs || []
      });
    } catch (err: any) { 
      console.error("Dashboard error:", err);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally { 
      setLoading(false); 
    }
  };

  // Z-REPORTNI OCHISH
  const openZReport = async () => {
    try {
      const { data, error } = await supabase.rpc('get_daily_z_report');
      if (error) throw error;
      setZData(data);
      setShowZReport(true);
    } catch (err) {
      toast.error("Hisobotni yuklab bo'lmadi");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [i18n.language]);

  // GRAFIK MA'LUMOTLARINI VALYUTAGA QARAB HISOBLASH (TS xatolari tuzatildi)
  const chartData = useMemo(() => {
    if (!stats?.chartData) return [];
    return stats.chartData.map((d: any) => {
      let convertedValue = Number(d.total); // Baza USD'da

      // TypeScript xatolarining oldini olish uchun aniq tekshiruv
      if (currency === 'UZS') {
        convertedValue = d.total * rates.USD;
      } else if (currency === 'EUR') {
        convertedValue = (d.total * rates.USD) / rates.EUR;
      } else if (currency === 'RUB') {
        convertedValue = (d.total * rates.USD) / rates.RUB;
      }

      return {
        name: new Date(d.day).toLocaleDateString(i18n.language, { weekday: 'short' }),
        converted: convertedValue
      };
    });
  }, [stats, currency, rates, i18n.language]);

  if (loading || !stats) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-700 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter ">{t('dashboard')}</h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                <Activity size={12} className="text-primary animate-pulse" /> Live Monitoring
             </p>
             <button 
               onClick={openZReport} 
               className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all shadow-lg shadow-emerald-500/5"
             >
                Bugungi Hisobot (Z)
             </button>
          </div>
        </div>

        {/* Valyuta Switcher */}
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
           {(['USD', 'UZS', 'EUR', 'RUB'] as const).map((c) => (
             <button
               key={c}
               onClick={() => setCurrency(c)}
               className={cn(
                 "px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
                 currency === c ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-500 hover:text-white"
               )}
             >
               {c}
             </button>
           ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mx-2">
        <KPIItem label={t('total_revenue')} value={convert(stats.totalRevenue)} icon={TrendingUp} color="text-emerald-500" />
        <div onClick={() => setActiveTab('stock')} className="cursor-pointer">
          <KPIItem label={t('inventory_value')} value={convert(stats.inventoryValue)} icon={ShoppingBag} color="text-blue-400" trend="STOCK" />
        </div>
        <div onClick={() => setActiveTab('debts')} className="cursor-pointer">
          <KPIItem label={t('debts_label')} value={convert(stats.totalDebts)} icon={Wallet} color="text-rose-500" trend="DEBITS" />
        </div>
        <div onClick={() => setActiveTab('lowstock')} className="cursor-pointer">
          <KPIItem 
            label={t('low_stock')} 
            value={stats.lowStockCount.toString()} 
            icon={AlertTriangle} 
            color={stats.lowStockCount > 0 ? "text-rose-500 animate-pulse" : "text-amber-500"} 
            trend="LIMIT" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-2">
          {/* SALES CHART */}
          <div className="lg:col-span-2 p-10 bg-[#0c0c0e] border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden h-[480px]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
             <div className="flex justify-between items-center relative z-10 mb-8">
                <h3 className="text-xl font-black text-white uppercase flex items-center gap-3 tracking-tight">
                  <Activity className="text-primary"/> {t('sales_dynamics')}
                </h3>
                <div className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-500 flex items-center gap-2">
                   <Calendar size={14} /> Last 7 Days
                </div>
             </div>
             
             <div className="h-80 w-full min-h-[320px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} dy={10} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#080809', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff' }} 
                      formatter={(val: any) => [convert(Number(val)), t('total_revenue')]} 
                    />
                    <Area type="monotone" dataKey="converted" stroke="#34d399" strokeWidth={5} fill="url(#g)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="p-10 bg-[#0c0c0e] border border-white/5 rounded-[3.5rem] shadow-2xl h-[480px] flex flex-col overflow-hidden">
             <h3 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-3 tracking-tighter">
               <History className="text-primary"/> {t('recent_activity')}
             </h3>
             <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pr-2">
                {stats.recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-4 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shadow-[0_0_8px_#34d399] group-hover:scale-150 transition-all" />
                    <div>
                      <p className="text-[13px] font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-primary transition-colors">
                        {log.details}
                      </p>
                      <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">
                        {new Date(log.created_at).toLocaleTimeString()} • {log.user_name}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                     <History size={48} />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">{t('no_data')}</p>
                  </div>
                )}
             </div>
          </div>
      </div>

      {/* Z-REPORT MODAL */}
      <AnimatePresence>
        {showZReport && zData && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <motion.div 
              initial={{scale:0.9, y:20, opacity:0}} 
              animate={{scale:1, y:0, opacity:1}} 
              exit={{scale:0.9, y:20, opacity:0}}
              className="bg-[#0c0c0e] border border-white/10 rounded-[3rem] p-12 max-w-md w-full space-y-8 shadow-2xl shadow-emerald-500/5"
            >
               <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 mb-4">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Kunlik Yopilish</h3>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                    {new Date().toLocaleDateString()} — Z-REPORT
                  </p>
               </div>
               
               <div className="space-y-4">
                  <ReportRow label="Umumiy Savdo" value={convert(zData.total_sales)} />
                  <ReportRow label="Nasiya (Qarz)" value={convert(zData.debt_given)} color="text-rose-500" />
                  <ReportRow label="Xarajatlar" value={convert(zData.expenses)} />
                  <ReportRow label="Vozvratlar" value={convert(zData.returns)} />
                  
                  <div className="pt-6 border-t border-white/5">
                     <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] text-center">
                        <p className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest">Kassadagi Naqd Pul:</p>
                        <h2 className="text-4xl font-black text-emerald-500 italic">
                          {convert(zData.cash_in_hand)}
                        </h2>
                     </div>
                  </div>
               </div>

               <button 
                 onClick={() => setShowZReport(false)} 
                 className="w-full py-5 bg-white/5 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5"
               >
                 Yopish
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// KPI Item Component
function KPIItem({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-700" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn("p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner", color)}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        {trend && (
          <span className="text-[9px] font-black px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 uppercase tracking-widest">
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">{label}</p>
        <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{value}</h3>
      </div>
    </div>
  );
}

// Report Row Component
function ReportRow({ label, value, color = "text-white" }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
      <span className={cn("text-lg font-black tracking-tighter", color)}>{value}</span>
    </div>
  );
}