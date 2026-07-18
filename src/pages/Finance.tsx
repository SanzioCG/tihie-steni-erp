import { useState, useEffect, useMemo } from 'react';
import { useCurrencyStore } from '../store/useCurrencyStore';
import {
  FileDown, Activity, PieChart as PieIcon,
  TrendingUp, History, Filter,
  Wallet, Percent, TrendingDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { cn, exportToPDF } from '../lib/utils';
import { useFinanceStats, useTransactionCategories } from '../hooks/queries/useQueries';

const COLORS = ['#34d399', '#fbbf24', '#818cf8', '#f43f5e', '#a78bfa'];

type DateRange = 'today' | 'week' | 'month' | 'all';

export default function Finance() {
  const { t, i18n } = useTranslation();
  const { convert, fetchRates } = useCurrencyStore();
  
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to: null };
    }
    if (dateRange === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: null };
    }
    if (dateRange === 'month') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start.toISOString(), to: null };
    }
    return { from: null, to: null };
  }, [dateRange]);
  
  const queryParams = useMemo(() => ({
    p_category: categoryFilter === 'ALL' ? null : categoryFilter,
    p_date_from: from,
    p_date_to: to,
  }), [categoryFilter, from, to]);

  const { data: stats = {
    balance: 0, totalIncome: 0, totalExpense: 0, netProfit: 0,
    grossProfit: 0, profitMargin: 0,
    chartData: [], categoryData: [], recentTransactions: []
  } } = useFinanceStats(queryParams);

  const { data: availableCategories = [] } = useTransactionCategories();

  useEffect(() => {
    fetchRates();
  }, []);

  return (
    <div className="space-y-5 text-left font-sans pb-24 md:pb-10">
      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Wallet size={22} className="text-primary" /> {t('finance_analysis')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Real-time Financial Status</p>
        </div>
        <button onClick={() => exportToPDF("Moliya_Hisoboti", [["KATEGORIYA", "SUMMA"]], stats.categoryData.map((c:any) => [c.name, convert(c.value)]))}
          className="p-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all">
          <FileDown size={20} />
        </button>
      </div>

      <div className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full pl-14 pr-5 py-4 bg-[#0c0c0e] border border-white/5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest outline-none appearance-none cursor-pointer"
          >
            <option value="ALL" className="bg-black">{t('all')} {t('category').toLowerCase()}</option>
            {availableCategories.map((c: string) => (
              <option key={c} value={c} className="bg-black">{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 bg-[#0c0c0e] border border-white/5 rounded-2xl p-2">
          {(['today', 'week', 'month', 'all'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                dateRange === r ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              {r === 'today' && t('today')}
              {r === 'week' && t('week')}
              {r === 'month' && t('month')}
              {r === 'all' && t('all')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mx-4">
        <FinanceKPI icon={Wallet} label={t('total_balance')} value={convert(stats.balance)} color="text-white" iconBg="bg-white/5 text-primary" border="border-white/5" />
        <FinanceKPI icon={TrendingUp} label={t('gross_profit')} value={convert(stats.grossProfit || 0)} color="text-white" iconBg="bg-emerald-500/10 text-emerald-500" border="border-emerald-500/10" />
        <FinanceKPI icon={TrendingUp} label={t('net_profit_label')} value={convert(stats.netProfit || 0)} color="text-white" iconBg="bg-emerald-500/10 text-emerald-500" border="border-emerald-500/20" />
        <FinanceKPI icon={Percent} label={t('profit_margin')} value={`${stats.profitMargin || 0}%`} color="text-white" iconBg="bg-amber-500/10 text-amber-500" border="border-amber-500/10" />
        <FinanceKPI icon={TrendingDown} label={t('total_expenses')} value={`-${convert(stats.totalExpense)}`} color="text-white" iconBg="bg-rose-500/10 text-rose-500" border="border-rose-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mx-4">
        <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl h-100">
          <h4 className="text-[10px] font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
            <Activity size={14} className="text-primary"/> {t('flow_dynamics')}
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                  <linearGradient id="cO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid #1f2937', borderRadius: '15px', color: '#fff'}} 
                  labelStyle={{color: '#9ca3af'}}
                />
                <Area type="monotone" name={t('income')} dataKey="income" stroke="#34d399" strokeWidth={4} fill="url(#cI)" />
                <Area type="monotone" name={t('expense')} dataKey="expense" stroke="#f43f5e" strokeWidth={4} fill="url(#cO)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl flex flex-col items-center">
           <h4 className="text-[10px] font-black text-gray-500 uppercase mb-5 self-start flex items-center gap-2">
            <PieIcon size={14} className="text-primary"/> {t('expense_distribution')}
           </h4>
           <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={stats.categoryData.length > 0 ? stats.categoryData : [{value: 1}]} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {stats.categoryData.map((e:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: 'none', borderRadius: '10px'}} />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="grid grid-cols-2 gap-x-10 gap-y-3 mt-6 w-full px-4">
              {stats.categoryData.map((cat:any, i:number) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{cat.name}</span>
                   </div>
                   <span className="text-[11px] font-black text-white">{convert(cat.value)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="mx-4 p-5 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl">
         <h4 className="text-[10px] font-black text-gray-500 uppercase mb-5 flex items-center gap-2">
           <History size={14} className="text-primary"/> {t('recent_transactions')}
         </h4>
         <div className="space-y-2.5">
            {stats.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-white/2 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                 <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate max-w-50">{tx.description}</p>
                    <p className="text-[9px] text-gray-600 font-black uppercase mt-1 tracking-widest">{tx.category} • {new Date(tx.created_at).toLocaleDateString(i18n.language)}</p>
                 </div>
                 <div className={cn("text-base font-black tracking-tighter", tx.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
                    {tx.type === 'income' ? '+' : '-'}{convert(tx.amount)}
                 </div>
              </div>
            ))}
            {stats.recentTransactions.length === 0 && <p className="py-10 text-center text-gray-700 font-black uppercase text-[10px] tracking-widest">{t('no_data')}</p>}
         </div>
      </div>
    </div>
  );
}

function FinanceKPI({ icon: Icon, label, value, color, iconBg, border }: any) {
  return (
    <div className={cn("p-4 bg-[#0c0c0e] border rounded-2xl shadow-xl flex items-center gap-3", border)}>
      <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 truncate">{label}</p>
        <p className={cn("text-xl font-black tracking-tighter truncate", color)}>{value}</p>
      </div>
    </div>
  );
}