import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, AlertTriangle, Activity, ShoppingBag, 
  History, Wallet, Loader2, ArrowUpRight, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore'; // Valyuta do'koni
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

      // 1. Jami tushum (Bazada USD)
      const { data: sales } = await supabase.from('sales').select('total_amount, created_at');
      const revenueUSD = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

      // 2. Ombor Qiymati (remaining_quantity * purchase_price - Bazada USD)
      const { data: batches } = await supabase.from('batches').select('remaining_quantity, purchase_price, min_limit');
      const invValueUSD = batches?.reduce((sum, b) => sum + (Number(b.remaining_quantity) * Number(b.purchase_price)), 0) || 0;
      const lowStock = batches?.filter(b => Number(b.remaining_quantity) <= Number(b.min_limit || 0)).length || 0;

      // 3. Jami Qarzlar (Bazada USD)
      const { data: clients } = await supabase.from('clients').select('balance');
      const debtsUSD = clients?.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0) || 0;

      // 4. Oxirgi Harakatlar
      const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6);

      // 5. Grafik (Oxirgi 7 kun) - Kursga ko'paytirilgan holatda
      const chart = sales?.slice(-7).map(s => ({
        name: new Date(s.created_at).toLocaleDateString(i18n.language, { weekday: 'short' }),
        sumUSD: s.total_amount // Bazadagi asl qiymat
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
    fetchRates(); // Bankdan kurslarni olish
    fetchDashboardData();

    // Real-time listener
    const channel = supabase.channel('db_sync').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchDashboardData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [i18n.language]);

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500">
      
      {/* HEADER & CURRENCY SWITCHER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-white uppercase  tracking-tighter">
            {t('dashboard')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
             <Globe size={12} /> {t('live_monitoring')} • Real-time CBU Rates
          </p>
        </div>

        {/* VALYUTA TANLASH TUGMALARI */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
           {(['USD', 'UZS', 'EUR', 'RUB'] as const).map((c) => (
             <button
               key={c}
               onClick={() => setCurrency(c)}
               className={cn(
                 "px-5 py-2 rounded-xl text-[10px] font-black transition-all",
                 currency === c ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-500 hover:text-white"
               )}
             >
               {c}
             </button>
           ))}
        </div>
      </div>

      {/* KPI CARDS (Barcha qiymatlar convert() funksiyasidan o'tadi) */}
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
            trend="OMBOR" 
          />
        </div>

        <div onClick={() => setActiveTab('debts')} className="cursor-pointer">
          <KPIItem 
            label={t('debts_label')} 
            value={convert(stats.totalDebts)} 
            icon={Wallet} 
            color="text-rose-500" 
            trend="QARZLAR" 
          />
        </div>

        <div onClick={() => setActiveTab('lowstock')} className="cursor-pointer">
          <KPIItem 
            label={t('low_stock')} 
            value={`${stats.lowStockCount} ta partiya`} 
            icon={AlertTriangle} 
            color={stats.lowStockCount > 0 ? "text-rose-500 animate-pulse" : "text-amber-500"} 
            trend="DIQQAT" 
          />
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-2">
        <div className="lg:col-span-2 p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl relative">
           <h3 className="text-lg font-black text-white uppercase italic mb-10 flex items-center gap-3">
             <Activity className="text-primary"/> Savdo Dinamikasi ({currency})
           </h3>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData.map(d => ({ ...d, sumConverted: currency === 'USD' ? d.sumUSD : currency === 'UZS' ? d.sumUSD * rates.USD : (d.sumUSD * rates.USD) / (rates[currency] || 1) }))}>
                  <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
                  <Tooltip contentStyle={{backgroundColor: '#080809', border: '1px solid #1f2937', borderRadius: '15px', color: '#fff'}} 
                    formatter={(val: number) => [convert(val), 'Summa']}
                  />
                  <Area type="monotone" dataKey="sumConverted" stroke="#34d399" strokeWidth={4} fill="url(#grad)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
          <h3 className="text-lg font-black text-white uppercase italic mb-8 flex items-center gap-3"><History className="text-primary"/> {t('recent_activity')}</h3>
          <div className="space-y-6 overflow-y-auto max-h-87.5 no-scrollbar">
            {stats.recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Activity size={16} className="text-gray-600 group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{log.details}</p>
                  <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">{new Date(log.created_at).toLocaleTimeString(i18n.language)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
      <div className="flex items-center justify-between mb-5">
        <div className={cn("p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform", color)}><Icon size={26} /></div>
        {trend && <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-white/5 text-gray-500 uppercase italic tracking-widest">{trend}</span>}
      </div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <h3 className="text-3xl font-black text-white tracking-tighter italic">{value}</h3>
    </div>
  );
}