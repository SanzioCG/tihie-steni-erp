import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, TrendingDown, AlertCircle, 
  Loader2, Banknote, User, ArrowRight,
  Filter, Calendar
} from 'lucide-react';
import { cn } from '../utils';
import PaymentModal from './PaymentModal';

export default function Debts() {
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const fetchDebtors = async () => {
    setLoading(true);
    // Balansi 0 dan kichik bo'lgan mijozlarni olamiz
    const { data } = await supabase
      .from('clients')
      .select('*')
      .lt('balance', 0)
      .order('balance', { ascending: true }); // Eng katta qarzdorlar tepada

    if (data) setDebtors(data);
    setLoading(false);
  };

  useEffect(() => { fetchDebtors(); }, []);

  const totalDebt = debtors.reduce((sum, d) => sum + Math.abs(Number(d.balance)), 0);

  const filtered = debtors.filter(d => d.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 text-left text-app-fg">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase decoration-rose-500/30">Qarzlar Nazorati</h2>
          <p className="text-sm text-app-muted italic">Debitorlik qarzlarini undirish va monitoring</p>
        </div>
        
        <div className="px-6 py-4 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem] flex items-center gap-4 shadow-lg shadow-rose-500/5">
           <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500"><TrendingDown size={24} /></div>
           <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Umumiy Qarz:</p>
              <p className="text-xl font-black text-rose-500 tracking-tighter">${totalDebt.toLocaleString()}</p>
           </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-rose-500" size={18} />
        <input 
          type="text" placeholder="Qarzdor ismini qidirish..." 
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-app-card border border-app-border rounded-[2rem] text-app-fg outline-none focus:border-rose-500/40 transition-all font-medium shadow-xl"
        />
      </div>

      {/* DEBTORS TABLE */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl min-h-[400px] relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-rose-500" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-app-border bg-rose-500/[0.02] text-rose-500">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Qarzdor Mijoz</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Limit</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Qarz Miqdori</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length > 0 ? filtered.map((client) => (
                <tr key={client.id} className="group hover:bg-rose-500/[0.01] transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 font-black">
                        {client.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-app-fg">{client.full_name}</p>
                        <p className="text-[10px] text-app-muted font-bold uppercase tracking-widest">{client.company_name || 'Shaxsiy'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase border border-white/5 px-2 py-1 rounded-md">
                      Limit: ${client.credit_limit?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center text-rose-500">
                    <span className="text-lg font-black tracking-tighter animate-pulse">
                      -${Math.abs(client.balance).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => { setSelectedClient(client); setIsPaymentOpen(true); }}
                      className="px-5 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-all flex items-center gap-2 ml-auto"
                    >
                      <Banknote size={14} /> To'lov Olish
                    </button>
                  </td>
                </tr>
              )) : !loading && (
                <tr>
                   <td colSpan={4} className="py-32 text-center">
                      <AlertCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                      <p className="text-app-muted italic font-medium">Hozircha hech kimdan qarz yo'q. Ajoyib!</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        onSuccess={fetchDebtors} 
        client={selectedClient} 
      />
    </div>
  );
}