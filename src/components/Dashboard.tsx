import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, AlertTriangle, Activity, ShoppingBag,
  History, Wallet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils';

export default function Dashboard() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0,
    assetValue: 0,
    totalDebts: 0,
    lowStock: 0,
    recentActivity: [] as any[],
    chartData: [] as any[]
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        // 1. Jami Tushum (Sales)
        const { data: sales } = await supabase.from('sales').select('total_amount, created_at');
        const revenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

        // 2. Ombor Qiymati va Kam Zaxira (User kiritgan limit asosida)
        // remaining_quantity va min_limit ustunlarini olamiz
        const { data: batches } = await supabase.from('batches').select('remaining_quantity, purchase_price, min_limit');
        
        const assets = batches?.reduce((sum, b) => sum + (Number(b.remaining_quantity) * Number(b.purchase_price)), 0) || 0;
        
        // 🔥 ENG MUHIMI: Foydalanuvchi kiritgan min_limit bilan solishtirish
        const lowStockCount = batches?.filter(b => 
          Number(b.remaining_quantity) <= Number(b.min_limit || 0)
        ).length || 0;

        // 3. Jami Qarzlar
        const { data: clients } = await supabase.from('clients').select('balance');
        const debts = clients?.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0) || 0;

        // 4. Oxirgi harakatlar
        const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);

        // 5. Grafik ma'lumotlari
        const chart = sales?.slice(-7).map(s => ({
          name: new Date(s.created_at).toLocaleDateString(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }),
          sum: s.total_amount
        })) || [];

        setData({
          totalRevenue: revenue,
          assetValue: assets,
          totalDebts: debts,
          lowStock: lowStockCount,
          recentActivity: logs || [],
          chartData: chart
        });
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();

    // Ma'lumotlar o'zgarganda real-time yangilash (ixtiyoriy)
    const subscription = supabase.channel('any_change')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchDashboardStats())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [i18n.language]);

  const textColor = theme === 'dark' ? '#a1a1aa' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="space-y-8 text-left text-app-fg animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase ">{t('dashboard')}</h2>
          <p className="text-sm text-app-muted font-medium italic mt-1">
            {i18n.language === 'uz' ? 'Holdingning real vaqtdagi moliyaviy holati' : 
             i18n.language === 'ru' ? 'Финансовое состояние холдинга в реальном времени' : 
             'Real-time financial status of the holding'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary animate-pulse">
           <Activity size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">Live Monitoring</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mx-2">
        <KPIItem label={t('total_revenue')} value={`$${data.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="text-primary" trend="+12%" />
        <KPIItem label={t('inventory_value')} value={`$${data.assetValue.toLocaleString()}`} icon={ShoppingBag} color="text-blue-400" trend={t('available')} />
        <KPIItem label={t('debts_label')} value={`$${data.totalDebts.toLocaleString()}`} icon={Wallet} color="text-rose-500" trend="!" />
        
        {/* KAM ZAXIRA KARTASI */}
        <KPIItem 
          label={t('low_stock')} 
          value={`${data.lowStock} ta partiya`} 
          icon={AlertTriangle} 
          color={data.lowStock > 0 ? "text-rose-500" : "text-amber-500"} 
          trend="Ombor" 
        />
      </div>

      {/* CHARTS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-2">
        <div className="lg:col-span-2 p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl relative">
          <h3 className="text-lg font-bold uppercase italic tracking-widest mb-10 flex items-center gap-2 text-white">
            <Activity size={20} className="text-primary" /> {i18n.language === 'uz' ? 'Savdo Dinamikasi' : 'Продажи'}
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} />
                <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#fff'}} />
                <Area type="monotone" dataKey="sum" stroke="#34d399" strokeWidth={4} fill="url(#colorSum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl">
          <h3 className="text-lg font-bold uppercase italic tracking-widest mb-8 flex items-center gap-2 text-white">
            <History size={20} className="text-primary" /> {t('recent_activity')}
          </h3>
          <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 no-scrollbar">
            {data.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Activity size={16} className="text-gray-500 group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{log.details}</p>
                  <p className="text-[10px] text-gray-600 font-medium mt-1 uppercase tracking-tighter">
                    {new Date(log.created_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })} • {log.user_name}
                  </p>
                </div>
              </div>
            ))}
            {data.recentActivity.length === 0 && (
              <div className="text-center py-10 text-gray-600 italic">{t('no_data')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-[2rem] shadow-xl hover:border-primary/30 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform", color)}>
          <Icon size={24} />
        </div>
        <span className="text-[9px] font-black px-2 py-1 rounded-lg border border-white/5 bg-white/5 text-gray-500 uppercase italic tracking-widest">
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <h3 className="text-2xl font-black tracking-tighter text-white">{value}</h3>
    </div>
  );
}