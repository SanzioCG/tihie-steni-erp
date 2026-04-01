import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, FileDown, Calendar, User, 
  CheckCircle2, AlertCircle, Filter, 
  ChevronDown, Package, ArrowUpRight, Loader2,
  Hash, Ruler
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, exportToPDF } from '../utils';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // FILTRLAR
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [typeFilter, setTypeFilter] = useState('ALL'); 

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (full_name, client_type, phone),
          products (name_uz, sku, categories (name_uz))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  // PDF EKSPORT
  const handleExport = () => {
    if (filteredSales.length === 0) return;
    const headers = [["Sana", "Mijoz", "Mahsulot", "Miqdor", "Summa", "Status"]];
    const dataRows = filteredSales.map(s => [
      new Date(s.created_at).toLocaleDateString(),
      s.clients?.full_name || 'Umumiy',
      s.products?.name_uz || 'Mahsulot',
      `${s.quantity} ${s.products?.categories?.name_uz?.toLowerCase().includes('tekstil') ? 'm2' : 'm'}`,
      `$${s.total_amount}`,
      s.status === 'completed' ? 'Yopilgan' : 'Qarz'
    ]);
    exportToPDF("Sotuvlar Hisoboti", headers, dataRows);
  };

  // FILTRLASH
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          sale.products?.name_uz?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || sale.clients?.client_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-white uppercase  tracking-tighter">Sotuvlar Tarixi</h2>
          <p className="text-sm text-gray-500 italic mt-1">Barcha amalga oshirilgan bitimlar va qoldiqlar nazorati</p>
        </div>
        <button 
          onClick={handleExport}
          className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all font-bold text-[10px] uppercase tracking-widest shadow-xl"
        >
           <FileDown size={18} /> PDF Eksport
        </button>
      </div>

      {/* FILTRLAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mx-2">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary" size={18} />
          <input 
            type="text" placeholder="Mijoz yoki mahsulot bo'yicha qidirish..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-xl font-medium"
          />
        </div>

        <div className="relative">
          <select 
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none appearance-none cursor-pointer focus:border-primary/40 font-bold text-[10px] uppercase tracking-widest"
          >
            <option value="ALL">Barcha holatlar</option>
            <option value="completed">Yopilgan (To'liq)</option>
            <option value="pending">Qarz (Pending)</option>
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>

        <div className="relative">
          <select 
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none appearance-none cursor-pointer focus:border-primary/40 font-bold text-[10px] uppercase tracking-widest"
          >
            <option value="ALL">Mijoz turlari</option>
            <option value="Chakana">Chakana</option>
            <option value="VIP">VIP</option>
            <option value="Ulgurji">Ulgurji</option>
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-125 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead className="bg-white/5 text-primary">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Sana</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Mijoz va Turi</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Sotilgan Mahsulot</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filteredSales.map((sale) => {
                const isTekstil = sale.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
                
                return (
                  <tr key={sale.id} className="group hover:bg-white/1 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2 text-app-muted font-mono text-[11px]">
                           <Calendar size={12} /> {new Date(sale.created_at).toLocaleDateString('uz-UZ')}
                         </div>
                         <div className="text-[10px] text-gray-700 font-bold uppercase tracking-tighter">
                           ID: {sale.id.substring(0, 8)}
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-black text-xs">
                          {sale.clients?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{sale.clients?.full_name || 'Umumiy Mijoz'}</p>
                          <div className="flex gap-2 mt-1">
                             <span className={cn(
                               "text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                               sale.clients?.client_type === 'VIP' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                               sale.clients?.client_type === 'Ulgurji' ? "text-blue-500 border-blue-500/20 bg-blue-500/5" : "text-gray-500 border-white/5 bg-white/5"
                             )}>
                               {sale.clients?.client_type || 'Chakana'}
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-sm font-bold text-white uppercase truncate max-w-50">{sale.products?.name_uz}</p>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] text-gray-600 font-mono">SKU: {sale.products?.sku}</span>
                             <span className="flex items-center gap-1 text-[10px] text-primary font-black uppercase">
                                <Ruler size={10} /> {Number(sale.quantity).toFixed(2)} {isTekstil ? 'm²' : 'metr'}
                             </span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-widest",
                        sale.status === 'completed' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                      )}>
                        {sale.status === 'completed' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                        {sale.status === 'completed' ? 'Yopilgan' : 'Qarz'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-xl font-black text-white italic tracking-tighter">${sale.total_amount.toLocaleString()}</p>
                       {sale.total_amount - (sale.paid_amount || 0) > 0 && (
                         <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">
                           Qarz: ${(sale.total_amount - (sale.paid_amount || 0)).toLocaleString()}
                         </p>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredSales.length === 0 && (
          <div className="py-32 text-center text-gray-700 italic uppercase font-black tracking-widest opacity-20">Sotuvlar topilmadi</div>
        )}
      </div>
    </div>
  );
}