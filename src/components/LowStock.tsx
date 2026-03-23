import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Loader2, Edit3, Ruler, Palette, 
  X, Maximize2, Package, AlertTriangle, 
  FileDown, CheckCircle2, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, exportToPDF } from '../utils'; 
import InboundModal from './InboundModal';

// 🔥 EXPORT DEFAULT BO'LISHI SHART!
export default function LowStock() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      // Supabase so'rovini bazadagi nomlar bilan moslashtiramiz
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          products (
            id, name_uz, series, sku, image_url, unit, category_id,
            categories (name_uz)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // 🔥 MANTIQ: Qoldiq limitga teng yoki undan kichik bo'lsa
        const filtered = data.filter(b => {
          const qty = Number(b.remaining_quantity || 0);
          const limit = Number(b.min_limit || 0);
          return qty > 0 && qty <= limit; 
        });
        
        const sorted = filtered.sort((a, b) => 
          (a.products?.name_uz || "").localeCompare(b.products?.name_uz || "")
        );
        setStocks(sorted);
      }
    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLowStock(); }, []);

  const filteredData = stocks.filter(s => 
    (s.products?.name_uz || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.batch_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.products?.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left p-2 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter flex items-center gap-3">
            <AlertTriangle size={32} /> Kam qolganlar
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">Zaxira limiti tugagan partiyalar</p>
        </div>
      </div>

      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
        <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-rose-500/20 rounded-3xl text-white outline-none focus:border-rose-500/40 shadow-xl" />
      </div>

      <div className="bg-[#0c0c0e] border border-rose-500/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-112.5 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-rose-500" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead className="bg-rose-500/5 text-rose-500 border-b border-rose-500/10 uppercase">
              <tr>
                <th className="px-6 py-6 text-[9px] font-black text-center w-16">#</th>
                <th className="px-6 py-6 text-[9px] font-black">Rasm</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">Kategoriya</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">Partiya</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">ID (SKU)</th>
                <th className="px-6 py-6 text-[9px] font-black">Mahsulot Nomi</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">Qoldiq</th>
                <th className="px-6 py-6 text-[9px] font-black text-right">Limit</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filteredData.map((batch, index) => {
                const isTekstil = batch.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
                return (
                  <tr key={batch.id} className="group hover:bg-rose-500/2 transition-all text-white">
                    <td className="px-6 py-5 text-gray-700 font-black text-xs text-center">{index + 1}</td>
                    <td className="px-6 py-5">
                      <div onClick={() => batch.products?.image_url && setSelectedImage(batch.products.image_url)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer relative">
                        {batch.products?.image_url ? <img src={batch.products.image_url} className="w-full h-full object-cover" alt="" /> : <Package className="w-full h-full p-3 text-gray-800" />}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-primary font-black text-[10px] uppercase opacity-60">{batch.products?.categories?.name_uz || '—'}</td>
                    <td className="px-6 py-5 text-center font-mono text-xs text-gray-500">{batch.batch_number}</td>
                    <td className="px-6 py-5 text-center font-mono text-[10px] text-gray-500 uppercase">{batch.products?.sku}</td>
                    <td className="px-6 py-5 text-sm font-bold uppercase">{batch.products?.name_uz}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex flex-col items-center px-3 py-1 bg-rose-500/10 text-rose-500 rounded-xl font-black text-sm border border-rose-500/20 animate-pulse">
                        {batch.remaining_quantity} <span className="text-[8px] opacity-60 uppercase">{isTekstil ? 'm²' : 'm'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-gray-600 font-mono">{batch.min_limit}</td>
                    <td className="px-6 py-5 text-center">
                      <button onClick={() => { setEditingBatch(batch); setIsInboundOpen(true); }} className="p-2.5 bg-rose-500 text-black rounded-xl hover:scale-110 shadow-lg shadow-rose-500/20"><Plus size={16}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredData.length === 0 && (
          <div className="py-32 text-center text-gray-600 italic">Hozircha kam qolgan tovarlar yo'q.</div>
        )}
      </div>

      <InboundModal isOpen={isInboundOpen} onClose={() => { setIsInboundOpen(false); setEditingBatch(null); }} onSuccess={fetchLowStock} editData={editingBatch} />
    </div>
  );
}