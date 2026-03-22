import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Activity, ArrowUpCircle, ArrowDownCircle, 
  Plus, AreaChart as AreaIcon, LineChart, BarChart3, PieChart as PieIcon, Wallet 
} from 'lucide-react';
import { 
  AreaChart, Area, LineChart as ReLineChart, Line, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { cn } from '../utils';

const COLORS = ['#34d399', '#fbbf24', '#818cf8', '#f43f5e', '#a78bfa'];

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('area');
  const [data, setData] = useState({ balance: 0, income: 0, expense: 0, mainChart: [], categoryData: [] });

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: true });

    if (txs) {
      const totalIn = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const totalOut = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      
      const categories = txs.filter(t => t.type === 'expense').reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {});

      setData({
        balance: totalIn - totalOut,
        income: totalIn,
        expense: totalOut,
        categoryData: Object.keys(categories).map(key => ({ name: key, value: categories[key] })),
        mainChart: txs.slice(-15).map(t => ({
          name: new Date(t.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
          income: t.type === 'income' ? Number(t.amount) : 0,
          expense: t.type === 'expense' ? Number(t.amount) : 0,
        }))
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchFinanceData(); }, []);

  const renderChart = () => {
    const common = { data: data.mainChart, margin: { left: -20, top: 10 } };
    if (chartType === 'line') return (
      <ReLineChart {...common}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid #1f2937', borderRadius: '10px'}} />
        <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={3} dot={{r:4}} />
        <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{r:4}} />
      </ReLineChart>
    );
    if (chartType === 'bar') return (
      <BarChart {...common}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} />
        <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
    return (
      <AreaChart {...common}>
        <defs>
          <linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
          <linearGradient id="cO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
        <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: 'none', borderRadius: '10px'}} />
        <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={4} fill="url(#cI)" />
        <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fill="url(#cO)" />
      </AreaChart>
    );
  };

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter ">Moliya Dashboard</h2>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button onClick={() => setChartType('area')} className={cn("p-2 rounded-lg", chartType === 'area' ? "bg-white/10 text-primary" : "text-gray-500")}><AreaIcon size={16}/></button>
          <button onClick={() => setChartType('line')} className={cn("p-2 rounded-lg", chartType === 'line' ? "bg-white/10 text-primary" : "text-gray-500")}><LineChart size={16}/></button>
          <button onClick={() => setChartType('bar')} className={cn("p-2 rounded-lg", chartType === 'bar' ? "bg-white/10 text-primary" : "text-gray-500")}><BarChart3 size={16}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-2">
         <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Jami Balans</p>
            <h3 className="text-4xl font-black text-white italic">{data.balance.toLocaleString()} <span className="text-xs text-gray-700">UZS</span></h3>
         </div>
         <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl text-emerald-500">
            <ArrowUpCircle className="mb-4" size={24}/><h3 className="text-3xl font-black italic">+{data.income.toLocaleString()}</h3>
         </div>
         <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl text-rose-500">
            <ArrowDownCircle className="mb-4" size={24}/><h3 className="text-3xl font-black italic">-{data.expense.toLocaleString()}</h3>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-2">
        <div className="lg:col-span-2 p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl relative">
          <h4 className="text-lg font-black text-white mb-10 italic uppercase tracking-widest flex items-center gap-2"><Activity size={20} className="text-primary"/> Analitika</h4>
          <div className="h-80 w-full">{renderChart()}</div>
        </div>

        <div className="p-8 bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl">
           <h4 className="text-lg font-black text-white mb-8 italic uppercase tracking-widest flex items-center gap-2"><PieIcon size={20} className="text-primary"/> Xarajatlar</h4>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={data.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.categoryData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: 'none', borderRadius: '10px'}} />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-6 space-y-3">
              {data.categoryData.map((cat, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-gray-500">{cat.name}</span><span className="text-white">{cat.value.toLocaleString()}</span></div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}