import { useState, useEffect } from 'react';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { 
  FileDown, Activity, PieChart as PieIcon, 
  Loader2, TrendingUp, History, Filter
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

  const getDateFromRange = (range: DateRange) => {
    const now = new Date();
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to: null };
    }
    if (range === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: null };
    }
    if (range === 'month') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start.toISOString(), to: null };
    }
    return { from: null, to: null };
  };

  const { from, to } = getDateFromRange(dateRange);
  
  const { data: stats = {
    balance: 0, totalIncome: 0, totalExpense: 0, netProfit: 0,
    chartData: [], categoryData: [], recentTransactions: []
  }, isLoading: loading } = useFinanceStats({
    p_category: categoryFilter === 'ALL' ? null : categoryFilter,
    p_date_from: from,
    p_date_to: to,
  });

  const { data: availableCategories = [] } = useTransactionCategories();

  useEffect(() => {
    fetchRates();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-app-bg"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="space-y-6 text-left font-sans pb-24 md:pb-10">
      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{t('finance_analysis')}</h2>
          <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Real-time Financial Status</p>
        </div>
        <button onClick={() => exportToPDF("Moliya_Hisoboti", [["KATEGORIYA", "SUMMA"]], stats.categoryData.map((c:any) => [c.name, convert(c.value)]))} 
          className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all">
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
            <option value="ALL" className="bg-black">Barcha kategoriyalar</option>
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
              {r === 'today' && 'Bugun'}
              {r === 'week' && 'Hafta'}
              {r === 'month' && 'Oy'}
              {r === 'all' && 'Hammasi'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-4">
        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-3xl" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">{t('total_balance')}</p>
           <h3 className="text-3xl font-black text-white tracking-tighter">{convert(stats.balance)}</h3>
        </div>

        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-xl flex justify-between items-center relative overflow-hidden">
           <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">{t('net_profit_label')}</p>
              <h3 className="text-3xl font-black text-white tracking-tighter">{convert(stats.netProfit)}</h3>
           </div>
           <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-lg shadow-emerald-500/5">
              <TrendingUp size={24} strokeWidth={3} />
           </div>
        </div>

        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-xl">
           <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3">{t('total_expenses')}</p>
           <h3 className="text-3xl font-black text-white tracking-tighter">-{convert(stats.totalExpense)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-4">
        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl h-100">
          <h4 className="text-[10px] font-black text-gray-500 uppercase mb-10 flex items-center gap-2">
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

        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
           <h4 className="text-[10px] font-black text-gray-500 uppercase mb-8 self-start flex items-center gap-2">
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

      <div className="mx-4 p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl">
         <h4 className="text-[10px] font-black text-gray-500 uppercase mb-8 flex items-center gap-2">
           <History size={14} className="text-primary"/> {t('recent_transactions')}
         </h4>
         <div className="space-y-4">
            {stats.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-4 bg-white/2 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
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