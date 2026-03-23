import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Loader2, Plus, Edit2, Trash2, 
  Package, X, Maximize2, Filter, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AddProductModal from './AddProductModal';

export default function Inventory() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Kategoriyalarni olish
      const { data: cats } = await supabase.from('categories').select('*').order('name_uz');
      if (cats) setCategories(cats);

      // Mahsulotlarni olish
      const { data: prods, error } = await supabase
        .from('products')
        .select(`*, categories (id, name_uz)`)
        .order('name_uz', { ascending: true });
      
      if (error) throw error;
      setProducts(prods || []);
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // FILTRLASH MANTIQLARI
  const filtered = products?.filter(p => {
    const matchesSearch = p.name_uz?.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || p.category_id === selectedCat;
    return matchesSearch && matchesCat;
  }) || [];

  return (
    <div className="space-y-6 text-left p-2 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Mahsulot Katalogi
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">Tizimdagi barcha mahsulotlar pasporti</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select 
              value={selectedCat} 
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0c0c0e] border border-white/5 rounded-2xl text-white text-[10px] font-black uppercase outline-none appearance-none cursor-pointer focus:border-primary/40 shadow-xl"
            >
              <option value="ALL">Barcha turlar</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_uz}</option>)}
            </select>
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={14} />
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          </div>

          <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="px-8 py-3 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[10px] tracking-widest">+ Mahsulot</button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
        <input 
          type="text" 
          placeholder="Qidirish..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-2xl font-medium"
        />
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-125 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-primary border-b border-white/5">
              <tr>
                <th className="px-6 py-6 text-[9px] font-black uppercase text-center w-16">#</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase">Rasm</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase text-center">Kategoriya</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase">Seriya</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase">Mahsulot Nomi</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase text-center">ID (SKU)</th>
                <th className="px-6 py-6 text-[9px] font-black uppercase text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filtered.map((product, index) => (
                <tr key={product.id} className="group hover:bg-white/1 transition-all text-white font-medium">
                  <td className="px-6 py-5 text-gray-700 font-black text-xs text-center">{index + 1}</td>
                  
                  {/* RASM ZOOM BILAN */}
                  <td className="px-6 py-5">
                    <div 
                      onClick={() => product.image_url && setZoomImage(product.image_url)}
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-inner cursor-pointer relative group/img"
                    >
                      {product.image_url ? (
                        <>
                          <img src={product.image_url} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Maximize2 size={14} className="text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-800">
                          <Package size={20} />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* KATEGORIYA */}
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 rounded-lg text-[9px] font-black uppercase">
                      {product.categories?.name_uz}
                    </span>
                  </td>

                  <td className="px-6 py-5 font-black text-[11px] text-gray-400 uppercase tracking-wider">{product.series}</td>
                  <td className="px-6 py-5 font-bold text-sm uppercase">{product.name_uz}</td>
                  <td className="px-6 py-5 text-center font-mono text-[10px] text-gray-500 uppercase">{product.sku}</td>
                  
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingData(product); setIsModalOpen(true); }} className="p-2 bg-white/5 hover:bg-primary text-gray-500 hover:text-black rounded-xl border border-white/5"><Edit2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🖼 IMAGE ZOOM LIGHTBOX */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 z-2000 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }}
              src={zoomImage} 
              className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 object-contain" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
        initialData={editingData} 
      />
    </div>
  );
}