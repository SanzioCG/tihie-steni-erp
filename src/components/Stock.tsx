import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Loader2, Plus, Edit3, Trash2, 
  Ruler, Palette, Hash, ChevronDown, Filter 
} from 'lucide-react';
import { cn } from '../utils';
import InboundModal from './InboundModal';

export default function Stock() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // Kategoriyalar ro'yxati
  const [loading, setLoading] = useState(true);
  
  // FILTRLAR HOLATI
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Kategoriyalarni olish
      const { data: cats } = await supabase.from('categories').select('*').order('name_uz');
      if (cats) setCategories(cats);

      // 2. Zaxira ma'lumotlarini olish
      const { data } = await supabase
        .from('batches')
        .select(`
          *, 
          products (id, name_uz, series, sku, unit, category_id, categories(id, name_uz)), 
          warehouses (id, name_uz)
        `);
      
      if (data) {
        // ALFABET BO'YICHA SARALASH (A-Z)
        const sorted = data.sort((a, b) => 
          (a.products?.name_uz || "").localeCompare(b.products?.name_uz || "")
        );
        setStocks(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // QIDIRUV VA KATEGORIYA BO'YICHA FILTRLASH
  const filteredStock = stocks.filter(s => {
    const matchesSearch = 
      s.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.products?.name_uz?.toLowerCase().includes(search.toLowerCase()) ||
      s.products?.sku?.toLowerCase().includes(search.toLowerCase()) ||
      s.products?.series?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || s.products?.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500 px-2">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter  text-primary">Ombor Zaxirasi</h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">Filtrlangan qoldiqlar va parametrlar</p>
        </div>
        <button onClick={() => { setEditingBatch(null); setIsInboundOpen(true); }} className="px-8 py-3.5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all text-[10px] uppercase tracking-widest">+ Yangi Kirim</button>
      </div>

      {/* FILTRLAR PANELI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* QIDIRUV INPUTI */}
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="SKU, Seriya yoki Mahsulot bo'yicha qidirish..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-xl font-medium" 
          />
        </div>

        {/* KATEGORIYA DROPDOWN FILTRI */}
        <div className="relative">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none appearance-none cursor-pointer focus:border-primary/40 text-[10px] font-black uppercase tracking-widest"
          >
            <option value="ALL">Barcha Kategoriyalar</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-[#0c0c0e] text-white font-bold">{cat.name_uz}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[450px]">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-white/[0.02] border-b border-white/5 text-primary uppercase">
              <tr>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em]">Partiya №</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em]">SKU</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em]">Seriya</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em]">Kategoriya</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-center">Rang</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-center">O'lcham</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-center">Qoldiq</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-right">Tan Narxi</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-right">Sotuv Narxi</th>
                <th className="px-6 py-6 text-[9px] font-black tracking-[0.2em] text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredStock.map((batch) => (
                <tr key={batch.id} className="group hover:bg-white/[0.01] transition-all text-white">
                  <td className="px-6 py-5 font-mono text-sm font-black text-gray-400">{batch.batch_number}</td>
                  <td className="px-6 py-5 font-mono text-[10px] text-gray-600 uppercase tracking-tighter">{batch.products?.sku}</td>
                  <td className="px-6 py-5 font-bold text-[11px] text-primary uppercase">{batch.products?.series || '—'}</td>
                  <td className="px-6 py-5 font-bold text-sm uppercase">{batch.products?.categories?.name_uz}</td>
                  
                  <td className="px-6 py-5 text-center">
                    {batch.color_name ? (
                      <span className="inline-flex px-3 py-1 bg-amber-500/5 text-amber-500 rounded-lg text-[9px] font-black uppercase border border-amber-500/10"><Palette size={10} className="mr-1"/> {batch.color_name}</span>
                    ) : <span className="text-gray-800">—</span>}
                  </td>

                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex px-3 py-1 bg-blue-500/5 text-blue-400 rounded-lg text-[9px] font-black uppercase border border-blue-500/10"><Ruler size={10} className="mr-1"/> {batch.height ? `${batch.height}x${batch.width}` : `${batch.length}m`}</span>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <span className={cn("text-base font-black tracking-tighter", batch.remaining_quantity <= 10 ? "text-rose-500" : "text-white")}>
                      {batch.remaining_quantity} <span className="text-[9px] opacity-30 uppercase ml-1">{batch.products?.unit}</span>
                    </span>
                  </td>

                  <td className="px-6 py-5 text-right font-black text-emerald-400 font-mono text-base">${batch.purchase_price}</td>
                  <td className="px-6 py-5 text-right font-black text-primary font-mono text-base">${batch.selling_price}</td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => { setEditingBatch(batch); setIsInboundOpen(true); }} className="p-2 bg-white/5 hover:bg-primary/20 text-primary rounded-xl border border-white/5 transition-all"><Edit3 size={14} /></button>
                      <button onClick={async () => { if(window.confirm("O'chirilsinmi?")) { await supabase.from('batches').delete().eq('id', batch.id); fetchData(); } }} className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-white/5 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InboundModal 
        isOpen={isInboundOpen} 
        onClose={() => { setIsInboundOpen(false); setEditingBatch(null); }} 
        onSuccess={fetchData} 
        editData={editingBatch} 
      />
    </div>
  );
}