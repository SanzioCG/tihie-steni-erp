import React, { useState } from 'react';
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, 
  Plus, Download, Filter, Search, Calendar, Landmark
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useTheme } from 'next-themes';
import { cn } from '../utils';

// Mock moliyaviy ma'lumotlar
const data = [
  { name: 'Dush', income: 4000, expense: 2400 },
  { name: 'Sesh', income: 3000, expense: 1398 },
  { name: 'Chor', income: 5000, expense: 3800 },
  { name: 'Pay', income: 2780, expense: 3908 },
  { name: 'Jum', income: 4890, expense: 4800 },
  { name: 'Shan', income: 5390, expense: 3800 },
  { name: 'Yak', income: 4490, expense: 4300 },
];

const transactions = [
  { id: 1, desc: 'Sotuv: Alyuminiy Profil #23', type: 'income', amount: '+1,200,000', category: 'Sotuv', date: 'Bugun, 14:20' },
  { id: 2, desc: 'Ombor ijarasi', type: 'expense', amount: '-4,500,000', category: 'Ijara', date: 'Bugun, 10:05' },
  { id: 3, desc: 'Xarid: Tekstil Xomashyo', type: 'expense', amount: '-8,200,000', category: 'Xarid', date: 'Kecha, 18:30' },
  { id: 4, desc: 'Sotuv: Mato Premium (10 rulon)', type: 'income', amount: '+12,500,000', category: 'Sotuv', date: 'Kecha, 15:10' },
];

export default function Finance() {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#a1a1aa' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="space-y-8">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-app-fg tracking-tight">Moliya va Hisobotlar</h2>
          <p className="text-sm text-app-muted">Holdingning moliyaviy holati tahlili</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-app-card border border-app-border rounded-2xl text-app-fg hover:border-primary/50 transition-all shadow-sm">
            <Download size={18} />
            Eksport
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all active:scale-95">
            <Plus size={20} />
            Yangi tranzaksiya
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-app-card border border-app-border rounded-[2.5rem] relative overflow-hidden group backdrop-blur-md">
          <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <Landmark size={24} />
            </div>
            <p className="text-sm font-bold text-app-muted uppercase tracking-widest">Jami Balans</p>
          </div>
          <h3 className="text-3xl font-bold text-app-fg tracking-tighter">1,450,200,000 UZS</h3>
          <p className="mt-2 text-[10px] text-primary font-bold uppercase tracking-wider">+12.5% o'tgan oydan</p>
        </div>

        <div className="p-8 bg-app-card border border-app-border rounded-[2.5rem] backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
              <ArrowUpCircle size={24} />
            </div>
            <p className="text-sm font-bold text-app-muted uppercase tracking-widest">Kirim (Bugun)</p>
          </div>
          <h3 className="text-3xl font-bold text-app-fg tracking-tighter">45,000,000 UZS</h3>
        </div>

        <div className="p-8 bg-app-card border border-app-border rounded-[2.5rem] backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20">
              <ArrowDownCircle size={24} />
            </div>
            <p className="text-sm font-bold text-app-muted uppercase tracking-widest">Chiqim (Bugun)</p>
          </div>
          <h3 className="text-3xl font-bold text-app-fg tracking-tighter">12,400,000 UZS</h3>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 bg-app-card border border-app-border rounded-[2.5rem] backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-app-fg">Kirim-chiqim grafigi</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Daromad
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                <div className="w-2 h-2 rounded-full bg-rose-500" /> Xarajat
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: textColor, fontSize: 11}} />
                <Tooltip contentStyle={{backgroundColor: theme === 'dark' ? '#121214' : '#fff', border: 'none', borderRadius: '15px'}} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="p-8 bg-app-card border border-app-border rounded-[2.5rem] backdrop-blur-md overflow-hidden">
          <h3 className="text-lg font-bold text-app-fg mb-6">Oxirgi amallar</h3>
          <div className="space-y-6">
            {transactions.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center border transition-all",
                    tr.type === 'income' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20" : "bg-rose-500/5 border-rose-500/10 text-rose-500 group-hover:bg-rose-500/20"
                  )}>
                    {tr.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-app-fg truncate w-32 md:w-full">{tr.desc}</p>
                    <p className="text-[10px] text-app-muted font-bold uppercase tracking-widest">{tr.category} • {tr.date}</p>
                  </div>
                </div>
                <p className={cn(
                  "text-sm font-bold tracking-tighter",
                  tr.type === 'income' ? "text-emerald-500" : "text-rose-500"
                )}>
                  {tr.amount}
                </p>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-app-fg/5 rounded-2xl text-[10px] font-bold text-app-muted uppercase tracking-[0.3em] hover:bg-app-fg/10 transition-all">
            Barcha tranzaksiyalar
          </button>
        </div>
      </div>
    </div>
  );
}