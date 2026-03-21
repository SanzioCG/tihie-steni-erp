import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, Package, Users, AlertTriangle, 
  DollarSign, Activity, ArrowUpRight, ShoppingBag,
  History, Wallet, Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { useTheme } from 'next-themes';
import { cn } from '../utils';

export default function Dashboard() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0,      // Jami tushum
    assetValue: 0,        // Ombordagi tovar summasi (Aktiv)
    totalDebts: 0,        // Berilgan qarzlar
    lowStock: 0,          // Kam qolgan tovarlar
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

        // 2. Ombor Qiymati (Aktivlar)
        const { data: batches } = await supabase.from('batches').select('quantity, purchase_price');
        const assets = batches?.reduce((sum, b) => sum + (Number(b.quantity) * Number(b.purchase_price)), 0) || 0;
        const lowStock = batches?.filter(b => b.quantity <= 10).length || 0;

        // 3. Jami Qarzlar (Debitorlik)
        const { data: clients } = await supabase.from('clients').select('balance');
        const debts = clients?.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0) || 0;

        // 4. Oxirgi harakatlar (Audit Logs)
        const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);

        // 5. Grafik uchun oxirgi 7 kunlik savdo
        const chart = sales?.slice(-7).map(s => ({
          name: new Date(s.created_at).toLocaleDateString('uz-UZ', { weekday: 'short' }),
          sum: s.total_amount
        })) || [];

        setData({
          totalRevenue: revenue,
          assetValue: assets,
          totalDebts: debts,
          lowStock: lowStock,
          recentActivity: logs || [],
          chartData: chart
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const textColor = theme === 'dark' ? '#a1a1aa' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="space-y-8 text-left text-app-fg">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase  decoration-primary/30">Boshqaruv Paneli</h2>
          <p className="text-sm text-app-muted font-medium italic mt-1">Holdingning real vaqtdagi moliyaviy holati</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary animate-pulse">
           <Activity size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">Live Monitoring</span>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIItem label="Jami Tushum" value={`$${data.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="text-primary" trend="+12%" />
        <KPIItem label="Ombor Qiymati" value={`$${data.assetValue.toLocaleString()}`} icon={ShoppingBag} color="text-blue-400" trend="Aktiv" />
        <KPIItem label="Qarzlar (Debitor)" value={`$${data.totalDebts.toLocaleString()}`} icon={Wallet} color="text-rose-500" trend="Diqqat" />
        <KPIItem label="Kam Zaxira" value={`${data.lowStock} ta partiya`} icon={AlertTriangle} color="text-amber-500" trend="Ombor" />
      </div>

      {/* MAIN CHARTS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 p-8 bg-app-card border border-app-border rounded-[3rem] shadow-2xl backdrop-blur-md">
          <h3 className="text-lg font-bold uppercase italic tracking-widest mb-10 flex items-center gap-2">
            <Activity size={20} className="text-primary" /> Savdo Dinamikasi
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} />
                <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px'}} />
                <Area type="monotone" dataKey="sum" stroke="#34d399" strokeWidth={4} fill="url(#colorSum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-8 bg-app-card border border-app-border rounded-[3rem] shadow-2xl backdrop-blur-md">
          <h3 className="text-lg font-bold uppercase italic tracking-widest mb-8 flex items-center gap-2">
            <History size={20} className="text-primary" /> So'nggi Harakatlar
          </h3>
          <div className="space-y-6">
            {data.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-app-fg/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Activity size={16} className="text-app-muted group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-app-fg leading-tight">{log.details}</p>
                  <p className="text-[10px] text-app-muted font-medium mt-1 uppercase tracking-tighter">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.user_name}
                  </p>
                </div>
              </div>
            ))}
            {data.recentActivity.length === 0 && (
              <div className="text-center py-10 text-app-muted italic">Harakatlar yo'q</div>
            )}
          </div>
          <button className="w-full mt-8 py-4 bg-app-fg/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-app-fg/10 transition-all">
            To'liq Audit Jurnali
          </button>
        </div>

      </div>
    </div>
  );
}

// KPI Item Component
function KPIItem({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-6 bg-app-card border border-app-border rounded-4xl shadow-xl hover:border-primary/30 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 bg-app-fg/5 rounded-2xl group-hover:scale-110 transition-transform", color)}>
          <Icon size={24} />
        </div>
        <span className="text-[10px] font-black px-2 py-1 rounded-lg border border-white/5 bg-white/5 text-app-muted uppercase italic">
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-bold text-app-muted uppercase tracking-[0.2em] mb-1">{label}</p>
      <h3 className="text-2xl font-black tracking-tighter text-app-fg">{value}</h3>
    </div>
  );
}