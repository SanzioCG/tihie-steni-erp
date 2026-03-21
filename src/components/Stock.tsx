import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, Filter, Boxes, Warehouse as WarehouseIcon, Loader2, Plus, Hash } from 'lucide-react';
import { cn } from '../utils';
import InboundModal from './InboundModal';

export default function Stock() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isInboundOpen, setIsInboundOpen] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('batches')
      .select(`*, products (name_uz, series, attribute, sku, unit), warehouses (name_uz)`)
      .order('created_at', { ascending: false });
    if (data) setStocks(data);
    setLoading(false);
  };

  useEffect(() => { fetchStock(); }, []);

  const filteredStock = stocks.filter(s => 
    s.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    s.products?.name_uz.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* HEADER - ZAXIRA UCHUN ALOHIDA */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-app-fg tracking-tight uppercase  decoration-primary/30">Ombor Zaxirasi</h2>
          <p className="text-sm text-app-muted font-medium italic">Skladagi real qoldiqlar va partiyalar</p>
        </div>
        <button 
          onClick={() => setIsInboundOpen(true)}
          className="px-8 py-3.5 bg-white text-black font-black rounded-2xl shadow-lg hover:bg-primary transition-all uppercase tracking-widest text-[11px] flex items-center gap-2"
        >
          <Plus size={18} /> Yangi Kirim
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-primary" size={18} />
        <input 
          type="text" placeholder="Partiya raqami yoki mahsulot bo'yicha qidirish..." 
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-app-card border border-app-border rounded-[2rem] text-app-fg outline-none focus:border-primary/40 transition-all"
        />
      </div>

      {/* TABLE - ZAXIRA FORMATI */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-xl min-h-[450px] relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-primary">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Partiya №</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Mahsulot (Katalogdan)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Ombor</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Mavjud Qoldiq</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Tan Narxi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStock.map((batch) => (
                <tr key={batch.id} className="group hover:bg-primary/[0.02] transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                        <Hash size={14} className="text-primary/50" />
                        <span className="font-mono text-lg font-black text-app-fg tracking-tighter">{batch.batch_number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] text-primary font-bold uppercase">{batch.products?.series}</p>
                    <p className="text-sm font-bold text-app-fg">{batch.products?.name_uz}</p>
                    <p className="text-[10px] text-app-muted italic">{batch.products?.attribute}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 text-app-muted">
                        <WarehouseIcon size={14} />
                        <span className="text-xs font-bold uppercase tracking-widest">{batch.warehouses?.name_uz}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={cn("text-lg font-black tracking-tighter", batch.quantity <= 10 ? "text-rose-500 animate-pulse" : "text-app-fg")}>
                      {batch.quantity} <span className="text-[10px] uppercase opacity-50">{batch.products?.unit}</span>
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-lg font-black text-primary font-mono">${batch.purchase_price}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InboundModal isOpen={isInboundOpen} onClose={() => setIsInboundOpen(false)} onSuccess={fetchStock} />
    </div>
  );
}