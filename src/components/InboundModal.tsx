import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, ChevronDown, Ruler, Box, AlertCircle, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { cn } from '../utils';

export default function InboundModal({ isOpen, onClose, onSuccess, editData }: any) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]); 
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    category_id: '',
    product_id: '',
    batch_number: '',
    purchase_price: '',
    selling_price: '',
    width_m: '',
    length_m: '',
    item_count: '1',
    min_limit: '5',
    color_name: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('name_uz');
      const { data: prods } = await supabase.from('products').select('*');
      if (cats) setCategories(cats);
      if (prods) setAllProducts(prods);

      if (editData) {
        setFormData({
          ...editData,
          batch_number: editData.batch_number.replace('P-', ''),
          width_m: editData.width_m?.toString() || '',
          length_m: editData.length_m?.toString() || '',
          min_limit: editData.min_limit?.toString() || '5'
        });
        if (prods) setFilteredProducts(prods.filter(p => p.category_id === editData.products?.category_id));
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, editData]);

  const handleCategoryChange = (id: string) => {
    setFormData({ ...formData, category_id: id, product_id: '' });
    setFilteredProducts(allProducts.filter(p => p.category_id === id));
    setSearchTerm('');
  };

  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const selectedProduct = allProducts.find(p => p.id === formData.product_id);
  const isTekstil = selectedCategory?.name_uz?.toLowerCase().includes('tekstil');

  const calculateTotal = () => {
    const w = Number(formData.width_m || 1);
    const l = Number(formData.length_m || 0);
    const c = Number(formData.item_count || 1);
    return isTekstil ? (w * l) : (l * c);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.batch_number) return alert("Ma'lumotlarni to'ldiring!");
    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      const payload = {
        product_id: formData.product_id,
        batch_number: `P-${formData.batch_number}`,
        quantity: totalAmount,
        remaining_quantity: totalAmount,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        min_limit: Number(formData.min_limit),
        width_m: isTekstil ? Number(formData.width_m) : null,
        length_m: Number(formData.length_m),
        color_name: formData.color_name || null,
      };

      if (editData?.id) await supabase.from('batches').update(payload).eq('id', editData.id);
      else await supabase.from('batches').insert([payload]);

      onSuccess(); onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-137.5 bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8 max-h-[95vh] overflow-y-auto no-scrollbar"
      >
        {/* CLOSE BUTTON */}
        <button onClick={onClose} className="absolute right-8 top-8 p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20} /></button>

        {/* TITLE */}
        <div className="flex items-center gap-3">
          <Layers className="text-white" size={28} />
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Kirim Nazorati</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          
          {/* 1 & 2: CATEGORY & PRODUCT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">1. Kategoriya</label>
              <select required value={formData.category_id} onChange={e => handleCategoryChange(e.target.value)} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-white/10 appearance-none">
                <option value="" className="bg-black text-gray-500">Tanlang...</option>
                {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
              </select>
            </div>

            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">2. Mahsulot</label>
              <div onClick={() => formData.category_id && setIsDropdownOpen(!isDropdownOpen)} className={cn("w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white flex justify-between items-center transition-all", !formData.category_id ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:bg-white/10")}>
                <span className="text-sm font-bold truncate">{selectedProduct ? selectedProduct.name_uz : "Qidirish..."}</span>
                <Search size={16} className="text-gray-600" />
              </div>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-160 overflow-hidden shadow-2xl">
                   <div className="max-h-48 overflow-y-auto scrollbar-hide">
                    {filteredProducts.map(p => (
                      <div key={p.id} onClick={() => { setFormData({...formData, product_id: p.id}); setIsDropdownOpen(false); }} className="px-6 py-4 hover:bg-primary/10 text-sm text-white cursor-pointer border-b border-white/2">{p.name_uz}</div>
                    ))}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC DIMENSIONS (ONLY IF CATEGORY SELECTED) */}
          {formData.category_id && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4 p-5 bg-white/2 border border-white/5 rounded-4xl">
              {isTekstil ? (
                <>
                  <div className="space-y-1"><label className="text-[9px] font-black text-primary uppercase flex items-center gap-1"><Ruler size={10}/> Eni (m)</label><input required type="number" step="0.01" value={formData.width_m} onChange={e => setFormData({...formData, width_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-black outline-none focus:border-primary" placeholder="0.00" /></div>
                  <div className="space-y-1 pl-4 border-l border-white/5"><label className="text-[9px] font-black text-primary uppercase flex items-center gap-1"><Ruler size={10}/> Uzunligi (m)</label><input required type="number" step="0.01" value={formData.length_m} onChange={e => setFormData({...formData, length_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-black outline-none focus:border-primary" placeholder="0.00" /></div>
                </>
              ) : (
                <>
                  <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 uppercase">Uzunligi (m)</label><input required type="number" step="0.01" value={formData.length_m} onChange={e => setFormData({...formData, length_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-black outline-none focus:border-blue-400" placeholder="0.00" /></div>
                  <div className="space-y-1 pl-4 border-l border-white/5"><label className="text-[9px] font-black text-blue-400 uppercase">Soni (Dona)</label><input required type="number" value={formData.item_count} onChange={e => setFormData({...formData, item_count: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-black outline-none focus:border-blue-400" placeholder="1" /></div>
                </>
              )}
            </motion.div>
          )}

          {/* PRICES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-emerald-500 uppercase ml-2">Tan Narx ($)</label>
               <input required type="number" step="0.01" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-emerald-500 font-bold outline-none" placeholder="0.00" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-primary uppercase ml-2">Sotuv Narx ($)</label>
               <input required type="number" step="0.01" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-bold outline-none" placeholder="0.00" />
            </div>
          </div>

          {/* BATCH & LIMIT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-600 uppercase ml-2">Partiya №</label>
               <div className="flex items-center px-5 py-4 bg-white/5 border border-white/5 rounded-2xl">
                 <span className="text-gray-500 font-bold mr-2 italic">P-</span>
                 <input required type="number" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="bg-transparent border-none text-white font-bold outline-none w-full" placeholder="1" />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-rose-500 uppercase ml-2 flex items-center gap-1"><AlertCircle size={12}/> Limit</label>
               <input required type="number" value={formData.min_limit} onChange={e => setFormData({...formData, min_limit: e.target.value})} className="w-full px-5 py-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-500 font-black outline-none" placeholder="5" />
            </div>
          </div>

          {/* SUMMARY BOX */}
          <div className="p-6 bg-primary/10 border border-primary/20 rounded-4xl text-center shadow-inner">
             <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Jami kirim qilinayotgan miqdor:</p>
             <h4 className="text-4xl font-black text-white tracking-tighter italic">
                {calculateTotal().toFixed(2)} <span className="text-sm not-italic opacity-40 uppercase ml-1">{isTekstil ? 'm²' : 'metr'}</span>
             </h4>
          </div>

          {/* SAVE BUTTON */}
          <button disabled={loading} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-3xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-3">
             {loading ? <Loader2 className="animate-spin" /> : <Save size={18}/>} Saqlash
          </button>

        </form>
      </motion.div>
    </div>
  );
}