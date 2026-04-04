import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, AlertTriangle, Activity, ShoppingBag, 
  History, Wallet, Loader2, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore'; 
import { cn } from '../utils';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency, fetchRates, convert, rates } = useCurrencyStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    inventoryValue: 0,
    totalDebts: 0,
    lowStockCount: 0,
    chartData: [] as any[],
    recentActivity: [] as any[]
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: sales } = await supabase.from('sales').select('total_amount, created_at');
      const revenueUSD = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

      const { data: batches } = await supabase.from('batches').select('remaining_quantity, purchase_price, min_limit');
      const invValueUSD = batches?.reduce((sum, b) => sum + (Number(b.remaining_quantity) * Number(b.purchase_price)), 0) || 0;
      
      const lowStock = batches?.filter(b => Number(b.remaining_quantity) <= Number(b.min_limit || 0)).length || 0;

      const { data: clients } = await supabase.from('clients').select('balance');
      const debtsUSD = clients?.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0) || 0;

      const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6);

      const chart = sales?.slice(-7).map(s => ({
        name: new Date(s.created_at).toLocaleDateString(i18n.language, { weekday: 'short' }),
        sumUSD: s.total_amount 
      })) || [];

      setStats({
        totalRevenue: revenueUSD,
        inventoryValue: invValueUSD,
        totalDebts: debtsUSD,
        lowStockCount: lowStock,
        chartData: chart,
        recentActivity: logs || []
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    fetchDashboardData();
    const channel = supabase.channel('db_realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchDashboardData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [i18n.language]);

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 font-sans pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            {t('dashboard')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
             <Activity size={12} className="text-primary animate-pulse" /> {t('live_monitoring')} • Real-time
          </p>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mx-2">
        <KPIItem 
          label={t('total_revenue')} 
          value={convert(stats.totalRevenue)} 
          icon={TrendingUp} 
          color="text-emerald-500" 
        />
        
        <div onClick={() => setActiveTab('stock')} className="cursor-pointer">
          <KPIItem 
            label={t('inventory_value')} 
            value={convert(stats.inventoryValue)} 
            icon={ShoppingBag} 
            color="text-blue-400" 
            trend="STOCK" 
          />
        </div>

        <div onClick={() => setActiveTab('debts')} className="cursor-pointer">
          <KPIItem 
            label={t('debts_label')} 
            value={convert(stats.totalDebts)} 
            icon={Wallet} 
            color="text-rose-500" 
            trend="DEBITS" 
          />
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
        <div className="lg:col-span-2 p-10 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center mb-12">
              <h3 className="text-xl font-black text-white uppercase flex items-center gap-3 tracking-tight">
                {/* TUZATILDI: Savdo Dinamikasi tarjimaga olindi */}
                <Activity className="text-primary"/> {t('sales_dynamics')} ({currency})
              </h3>
           </div>
           <div className="h-80 w-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData.map(d => ({ 
                  ...d, 
                  sumConverted: currency === 'USD' ? d.sumUSD : currency === 'UZS' ? d.sumUSD * rates.USD : (d.sumUSD * rates.USD) / (rates[currency] || 1) 
                }))}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.25}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#080809', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '15px', 
                      color: '#fff'
                    }}
                      formatter={(val: number) => [convert(val), t('total_revenue')]}  
                    />
                  <Area type="monotone" dataKey="sumConverted" stroke="#34d399" strokeWidth={4} fill="url(#g)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="p-10 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
          <h3 className="text-xl font-black text-white uppercase mb-10 flex items-center gap-3 tracking-tight">
            <History className="text-primary"/> {t('recent_activity')}
          </h3>
          <div className="space-y-7 flex-1 overflow-y-auto no-scrollbar">
            {stats.recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-5 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-all duration-300">
                  <Activity size={16} className="text-gray-500 group-hover:text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{log.details}</p>
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString(i18n.language)} • {log.user_name}</p>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 py-20">
                <History size={48} strokeWidth={1} />
                {/* TUZATILDI: 'Harakatlar yo'q' o'rniga t('no_data') ishlatildi */}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">{t('no_data')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl hover:border-primary/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn("p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500", color)}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        {trend && (
          <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-2">{label}</p>
        <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{value}</h3>
      </div>
    </div>
  );
}