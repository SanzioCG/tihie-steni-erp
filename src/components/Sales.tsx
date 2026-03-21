import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Plus, User, Calendar, Loader2, FileDown, Search } from 'lucide-react';
import POSModal from './POSModal';
import { generatePDF } from '../utils/exportPDF';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPOSOpen, setIsPOSOpen] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (data) setSales(data);
    setLoading(false);
  };

  useEffect(() => { fetchSales(); }, []);

  const exportPDF = () => {
    const headers = [["SANA", "MIJOZ", "SUMMA", "STATUS"]];
    const dataRows = sales.map(s => [new Date(s.created_at).toLocaleDateString(), s.customer_name, `$${s.total_amount}`, "TO'LANDI"]);
    generatePDF("Sotuvlar Tarixi Hisoboti", headers, dataRows);
  };

  return (
    <div className="space-y-8 text-left text-app-fg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase decoration-primary/30">Sotuvlar Tarixi</h2>
          <p className="text-sm text-app-muted italic">Mijozlar bilan amalga oshirilgan barcha bitimlar</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="px-6 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">
            <FileDown size={18} className="text-primary" /> PDF Eksport
          </button>
          <button onClick={() => setIsPOSOpen(true)} className="px-8 py-4 bg-primary text-black font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest text-[11px] flex items-center gap-2">
            <Plus size={20} /> Yangi Sotuv (POS)
          </button>
        </div>
      </div>

      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-xl min-h-112.5px relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-primary">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Sana</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Mijoz</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Jami Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sales.map((sale) => (
                <tr key={sale.id} className="group hover:bg-primary/1.0 transition-all">
                  <td className="px-8 py-5 text-xs font-bold text-app-muted flex items-center gap-2"><Calendar size={14}/>{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-8 py-5 font-bold text-sm text-app-fg flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary font-black">{sale.customer_name.charAt(0)}</div>
                    {sale.customer_name}
                  </td>
                  <td className="px-8 py-5 text-center"><span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Muvaffaqiyatli</span></td>
                  <td className="px-8 py-5 text-right font-black text-lg tracking-tighter text-white">${sale.total_amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <POSModal isOpen={isPOSOpen} onClose={() => setIsPOSOpen(false)} onSuccess={fetchSales} />
    </div>
  );
}