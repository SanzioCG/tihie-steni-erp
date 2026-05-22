import { useState } from 'react';
import { 
  Search, Loader2, Plus, Edit2, Trash2, 
  Package, X, Maximize2, Filter, Boxes 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import AddProductModal from '../components/modals/AddProductModal';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useProducts, useCategories, useDeleteProduct } from '../hooks/queries/useProducts';

export default function Inventory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any | null>(null);

  const { data: products = [], isLoading: loading } = useProducts();
  const { data: categories = [] } = useCategories();
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete_prod'))) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Mahsulot o'chirildi");
    } catch (err: any) {
      toast.error("O'chirish imkonsiz: Mahsulotga bog'liq savdo yoki partiyalar bor");
    }
  };

  const filtered = products?.filter((p: any) => {
    const matchesSearch = p.name_uz?.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || p.category_id === selectedCat;
    return matchesSearch && matchesCat;
  }) || [];

  return (
    <div className="space-y-6 text-left p-2 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">
            {t('products')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">{t('inventory_subtitle')}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select 
              value={selectedCat} 
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0c0c0e] border border-white/5 rounded-2xl text-white text-[10px] font-black uppercase outline-none appearance-none cursor-pointer focus:border-primary/40 shadow-xl"
            >
              <option value="ALL">{t('all_categories')}</option>
              {categories.map((c: any) => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
            </select>
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={14} />
          </div>

          <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="px-8 py-3 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[10px] tracking-widest">+ {t('add_product')}</button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
        <input 
          type="text" 
          placeholder={t('search')} 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-2xl font-bold text-sm uppercase"
        />
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-4xl overflow-hidden shadow-2xl relative min-h-125 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead className="bg-white/5 text-primary border-b border-white/10">
              <tr>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-center w-16">#</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase">{t('image')}</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-center">{t('category')}</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase">{t('name')}</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-center">{t('sku')}</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-center">{t('stock') || 'Zaxira'}</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p: any, index: number) => (
                <tr key={p.id} className="group hover:bg-white/5 transition-all text-white font-medium">
                  <td className="px-6 py-5 text-gray-700 font-black text-xs text-center">{index + 1}</td>
                  
                  <td className="px-6 py-5">
                    <div 
                      onClick={() => p.image_url && setZoomImage(p.image_url)}
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-inner cursor-pointer relative group/img"
                    >
                      {p.image_url ? (
                        <>
                          <img 
                            loading="lazy"
                            decoding="async"
                            src={`${p.image_url}${p.image_url.includes('?') ? '&' : '?'}v=${new Date(p.updated_at).getTime()}`} 
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-110" 
                            alt="" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Maximize2 size={14} className="text-white" />
                          </div>
                        </>
                      ) : <div className="w-full h-full flex items-center justify-center text-gray-800"><Package size={20} /></div>}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {p.categories?.name_uz}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <p className="font-black text-sm uppercase tracking-tight">{p.name_uz}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{p.series || '—'}</p>
                  </td>

                  <td className="px-6 py-5 text-center font-mono text-[10px] text-gray-500 font-black uppercase tracking-tighter">{p.sku}</td>
                  
                  <td className="px-6 py-5 text-center">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-xs",
                      p.total_stock <= (p.min_stock || 10) 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    )}>
                      <Boxes size={14} />
                      {p.total_stock.toFixed(2)}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setEditingData(p); setIsModalOpen(true); }} 
                        className="p-2.5 bg-white/5 hover:bg-primary text-gray-500 hover:text-black rounded-xl border border-white/10 transition-all active:scale-90"
                      >
                        <Edit2 size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className="p-2.5 bg-white/5 hover:bg-rose-500 text-gray-500 hover:text-white rounded-xl border border-white/10 transition-all active:scale-90"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Search size={48} />
                      <p className="font-black uppercase text-xs tracking-widest">{t('no_data')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ZOOM MODAL */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }}
              src={zoomImage} 
              className="max-w-full max-h-[90vh] rounded-4xl shadow-2xl border border-white/10 object-contain" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['products'] })} 
        initialData={editingData} 
      />
    </div>
  );
}