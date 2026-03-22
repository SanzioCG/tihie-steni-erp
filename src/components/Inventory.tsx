import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Plus, Search, Edit2, Trash2, Package, ChevronDown, Hash, Tag, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AddProductModal from './AddProductModal';
import { cn } from '../utils';

export default function Inventory() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('categories').select('*');
    if (cats) setCategories(cats);

    const { data: prods } = await supabase
      .from('products')
      .select('*, categories(id, name_uz)')
      .order('name_uz', { ascending: true }); // A-Z saralash
    
    if (prods) setProducts(prods);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name_uz?.toLowerCase().includes(search.toLowerCase()) || 
      p.series?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter ">Mahsulot Katalogi</h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">Tizimdagi barcha mahsulotlar pasporti</p>
        </div>
        <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="px-8 py-3.5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[10px] tracking-widest">
          + Yangi Mahsulot
        </button>
      </div>

      {/* FILTRLAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mx-2">
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" placeholder="Qidirish (Seriya, Nom, SKU)..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-xl font-medium"
          />
        </div>
        
        <div className="relative">
          <select 
            value={activeCategory} 
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none appearance-none cursor-pointer focus:border-primary/40 font-bold text-[10px] uppercase tracking-widest"
          >
            <option value="ALL">Barcha turlar</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_uz}</option>)}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* JADVAL - HAR BIR MA'LUMOT ALOHIDA USTUNDA */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[450px] mx-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr className="text-primary">
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em]">Rasm</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em]">Seriya</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em]">Mahsulot Nomi</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em]">Rang / Raqam</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-center">SKU</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-center">Kategoriya</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="group hover:bg-white/[0.01] transition-all">
                  {/* RASM */}
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shadow-inner">
                       {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" alt="" /> : <Package className="w-full h-full p-3 text-gray-800" />}
                    </div>
                  </td>

                  {/* SERIYA */}
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">{p.series || '—'}</span>
                  </td>

                  {/* NOMI */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white uppercase">{p.name_uz}</span>
                  </td>

                  {/* RANG / RAQAM */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Palette size={12} className="text-gray-600" />
                       <span className="text-xs font-medium text-gray-400 uppercase">{p.attribute || 'Standart'}</span>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 font-mono text-[10px] text-gray-500 uppercase tracking-tighter">
                      {p.sku}
                    </span>
                  </td>

                  {/* KATEGORIYA */}
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-[9px] font-black uppercase">
                      {p.categories?.name_uz}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => { setEditingData(p); setIsModalOpen(true); }} className="p-2.5 bg-white/5 hover:bg-primary/20 text-primary rounded-xl border border-white/5 transition-all">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={async () => { if(window.confirm("O'chirilsinmi?")) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-white/5 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} initialData={editingData} />
    </div>
  );
}