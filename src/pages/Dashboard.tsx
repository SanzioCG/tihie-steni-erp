import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  TrendingUp, AlertTriangle, Activity, ShoppingBag, 
  History, Wallet, Loader2, Calendar, FileText,
  DollarSign, Award, User, Percent
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore'; 
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDashboardStats, useRecentActivity } from '../hooks/queries/useDashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currency, setCurrency, fetchRates, convert, rates } = useCurrencyStore();
  
  const { data: stats } = useDashboardStats();
  const { data: recentActivity = [] } = useRecentActivity();
  
  const [showZReport, setShowZReport] = useState(false);
  const [zData, setZData] = useState<any>(null);

  const openZReport = async () => {
    try {
      const { data, error } = await supabase.rpc('get_daily_z_report');
      if (error) throw error;
      setZData(data);
      setShowZReport(true);
    } catch (err) {
      toast.error(t('error_loading_report') || "Hisobotni yuklab bo'lmadi");
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const chartData = useMemo(() => {
    if (!stats?.chartData) return [];
    return stats.chartData.map((d: any) => {
      let convertedValue = Number(d.sales);
      if (currency === 'UZS') {
        convertedValue = d.sales * rates.USD;
      } else if (currency === 'EUR') {
        convertedValue = (d.sales * rates.USD) / rates.EUR;
      } else if (currency === 'RUB') {
        convertedValue = (d.sales * rates.USD) / rates.RUB;
      }
      return {
        name: new Date(d.day).toLocaleDateString(i18n.language, { weekday: 'short' }),
        converted: convertedValue
      };
    });
  }, [stats, currency, rates, i18n.language]);

  // Marja % hisobi
  const profitMargin = stats && stats.todaySales > 0 
    ? ((stats.todayProfit / stats.todaySales) * 100).toFixed(1)
    : '0';

  if (!stats) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-700 font-sans pb-20">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter ">{t('dashboard')}</h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                <Activity size={12} className="text-primary animate-pulse" /> Live Monitoring
             </p>
             <button 
               onClick={openZReport} 
               className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all shadow-lg shadow-emerald-500/5"
             >
                {t('daily_z_report') || "Bugungi Hisobot (Z)"}
             </button>
          </div>
        </div>

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

      {/* KPI to'ri: bugungi ko'rsatkichlar + ombor/top (zich 2×4) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mx-2">
        <KPIItem
          label={t('today_sales') || "Bugungi sotuv"}
          value={convert(stats.todaySales)}
          icon={TrendingUp}
          color="text-emerald-500"
        />
        <KPIItem
          label={t('today_profit') || "Bugungi foyda"}
          value={convert(stats.todayProfit)}
          icon={DollarSign}
          color="text-emerald-500"
          trend={`${profitMargin}%`}
        />
        <KPIItem
          label={t('cash_balance') || "Naqd pul"}
          value={convert(stats.cashBalance)}
          icon={Wallet}
          color="text-blue-400"
        />
        <KPIItem
          label={t('debts_label')}
          value={convert(stats.totalDebt)}
          icon={Wallet}
          color="text-rose-500"
          trend="DEBT"
          onClick={() => navigate('/debts')}
        />
        <KPIItem
          label={t('inventory_value')}
          value={convert(stats.inventoryValue)}
          icon={ShoppingBag}
          color="text-blue-400"
          trend="STOCK"
          onClick={() => navigate('/stock')}
        />
        <KPIItem
          label={t('low_stock')}
          value={stats.lowStockCount.toString()}
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 ? "text-rose-500 animate-pulse" : "text-amber-500"}
          trend="LIMIT"
          onClick={() => navigate('/lowstock')}
        />
        <KPIItem
          label={t('top_product') || "Top mahsulot"}
          value={stats.topProduct || '—'}
          icon={Award}
          color="text-amber-500"
          isText
        />
        <KPIItem
          label={t('top_client') || "Top mijoz"}
          value={stats.topClient || '—'}
          icon={User}
          color="text-purple-400"
          isText
        />
      </div>

      {/* Grafik va Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mx-2">
          <div className="lg:col-span-2 p-5 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden h-[420px]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
             <div className="flex justify-between items-center relative z-10 mb-5">
                <h3 className="text-lg font-black text-white uppercase flex items-center gap-3 tracking-tight">
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

          <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl h-[420px] flex flex-col overflow-hidden">
             <h3 className="text-lg font-black text-white uppercase mb-5 flex items-center gap-3 tracking-tighter">
               <History className="text-primary"/> {t('recent_activity')}
             </h3>
             <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-2">
                {recentActivity.map((log: any) => (
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
                {recentActivity.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                     <History size={48} />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">{t('no_data')}</p>
                  </div>
                )}
             </div>
          </div>
      </div>

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
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{t('daily_closing') || "Kunlik Yopilish"}</h3>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                    {new Date().toLocaleDateString()} — Z-REPORT
                  </p>
               </div>
               
               <div className="space-y-4">
                  <ReportRow label={t('total_sales_z') || "Umumiy Savdo"} value={convert(zData.total_sales)} />
                  <ReportRow label={t('debt_given') || "Nasiya (Qarz)"} value={convert(zData.debt_given)} color="text-rose-500" />
                  <ReportRow label={t('expenses') || "Xarajatlar"} value={convert(zData.expenses)} />
                  <ReportRow label={t('returns_label') || "Vozvratlar"} value={convert(zData.returns)} />
                  
                  <div className="pt-6 border-t border-white/5">
                     <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] text-center">
                        <p className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest">{t('cash_in_hand') || "Kassadagi Naqd Pul"}:</p>
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
                 {t('close') || "Yopish"}
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, color, trend, isText, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden group flex items-center gap-3",
        onClick && "cursor-pointer hover:border-white/10 transition-colors"
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-700" />
      <div className={cn("p-2.5 bg-white/5 rounded-xl group-hover:scale-110 transition-transform duration-500 shadow-inner shrink-0 relative z-10", color)}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider truncate">{label}</p>
          {trend && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-500 uppercase tracking-widest shrink-0">
              {trend}
            </span>
          )}
        </div>
        <h3 className={cn(
          "font-black text-white tracking-tighter uppercase mt-0.5 truncate",
          isText ? "text-sm" : "text-xl"
        )}>{value}</h3>
      </div>
    </div>
  );
}

function ReportRow({ label, value, color = "text-white" }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
      <span className={cn("text-lg font-black tracking-tighter", color)}>{value}</span>
    </div>
  );
}