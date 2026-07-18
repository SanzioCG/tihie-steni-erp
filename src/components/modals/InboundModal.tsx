import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, Ruler, AlertCircle, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface InboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export default function InboundModal({ isOpen, onClose, onSuccess, editData }: InboundModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
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

  // Initial data
  useEffect(() => {
    const fetchData = async () => {
      const [cats, prods] = await Promise.all([
        supabase.from('categories').select('*').order('name_uz'),
        supabase.from('products').select('*'),
      ]);
      if (cats.data) setCategories(cats.data);
      if (prods.data) setAllProducts(prods.data);

      if (editData) {
        setFormData({
          category_id: editData.products?.category_id || '',
          product_id: editData.product_id || '',
          batch_number: editData.batch_number?.replace('P-', '') || '',
          purchase_price: editData.purchase_price?.toString() || '',
          selling_price: editData.selling_price?.toString() || '',
          width_m: editData.width_m?.toString() || '',
          length_m: editData.length_m?.toString() || '',
          item_count: '1',
          min_limit: editData.min_limit?.toString() || '5',
          color_name: editData.color_name || '',
        });
        if (prods.data) {
          setFilteredProducts(prods.data.filter(p => p.category_id === editData.products?.category_id));
          const editProd = prods.data.find(p => p.id === editData.product_id);
          if (editProd) setSearchTerm(editProd.name_uz);
        }
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, editData]);

  // Dropdown tashqarisiga bosilganda yopish
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        category_id: '', product_id: '', batch_number: '',
        purchase_price: '', selling_price: '',
        width_m: '', length_m: '', item_count: '1',
        min_limit: '5', color_name: ''
      });
      setSearchTerm('');
      setIsDropdownOpen(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleCategoryChange = (id: string) => {
    setFormData({ ...formData, category_id: id, product_id: '' });
    setFilteredProducts(allProducts.filter(p => p.category_id === id));
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const selectProduct = (p: any) => {
    setFormData(prev => ({ ...prev, product_id: p.id }));
    setSearchTerm(p.name_uz);
    setIsDropdownOpen(false);
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
    
    // Validatsiya
    if (!formData.product_id) return toast.error("Mahsulot tanlanmagan!");
    if (!formData.batch_number) return toast.error("Partiya raqami kerak!");
    
    const totalQuantity = calculateTotal();
    if (totalQuantity <= 0) return toast.error("Miqdor noto'g'ri!");
    
    const purchasePrice = Number(formData.purchase_price);
    const sellingPrice = Number(formData.selling_price);
    
    if (purchasePrice <= 0) return toast.error("Tan narxi noto'g'ri!");
    if (sellingPrice <= 0) return toast.error("Sotuv narxi noto'g'ri!");
    if (sellingPrice < purchasePrice) return toast.error("Sotuv narxi tan narxidan past!");
    
    setLoading(true);
    try {
      // Edit rejimi (eski usul — RPC yo'q)
      if (editData?.id) {
        const payload = {
          batch_number: `P-${formData.batch_number}`,
          quantity: totalQuantity,
          remaining_quantity: totalQuantity,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          min_limit: Number(formData.min_limit),
          width_m: isTekstil ? Number(formData.width_m) : null,
          length_m: Number(formData.length_m),
          color_name: formData.color_name || null,
        };
        
        const { error } = await supabase
          .from('batches')
          .update(payload)
          .eq('id', editData.id);
        
        if (error) throw error;
        toast.success("Partiya yangilandi!");
      } 
      // Yangi kirim — RPC orqali
      else {
        const { error } = await supabase.rpc('process_inbound_secure', {
          p_product_id: formData.product_id,
          p_batch_number: `P-${formData.batch_number}`,
          p_quantity: totalQuantity,
          p_purchase_price: purchasePrice,
          p_selling_price: sellingPrice,
          p_min_limit: Number(formData.min_limit),
          p_user_name: profile?.full_name || 'Admin',
          p_width_m: isTekstil ? Number(formData.width_m) : null,
          p_length_m: Number(formData.length_m),
          p_color_name: formData.color_name || null,
          p_product_name: selectedProduct?.name_uz || 'Mahsulot',
        });
        
        if (error) throw error;
        toast.success("Kirim muvaffaqiyatli!");
      }
      
      onSuccess();
      onClose();
    } catch (err: any) { 
      toast.error("Xatolik: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-137.5 bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8 max-h-[95vh] overflow-y-auto no-scrollbar"
      >
        <button onClick={onClose} className="absolute right-8 top-8 p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <Layers className="text-white" size={28} />
          <h2 className="text-2xl font-bold text-white uppercase italic tracking-tighter">
            {editData ? "Partiyani Tahrirlash" : t('inbound_control')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide ml-2">1. {t('category')}</label>
              <select 
                required 
                value={formData.category_id} 
                onChange={e => handleCategoryChange(e.target.value)} 
                disabled={!!editData}
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none uppercase text-sm disabled:opacity-50"
              >
                <option value="" className="bg-black">{t('select_placeholder')}</option>
                {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
              </select>
            </div>

            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide ml-2">2. {t('products')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  disabled={!formData.category_id || !!editData}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    if (formData.product_id) setFormData(prev => ({ ...prev, product_id: '' }));
                  }}
                  onFocus={() => formData.category_id && !editData && setIsDropdownOpen(true)}
                  placeholder={t('search_placeholder')}
                  className={cn(
                    "w-full px-5 py-4 pr-12 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none uppercase text-sm placeholder:text-gray-500",
                    (!formData.category_id || editData) ? "opacity-30 cursor-not-allowed" : "focus:border-primary/40"
                  )}
                />
                <Search size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              {isDropdownOpen && formData.category_id && !editData && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-160 max-h-48 overflow-y-auto">
                  {filteredProducts
                    .filter(p => p.name_uz.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className="px-6 py-4 hover:bg-primary/10 text-sm text-white font-bold cursor-pointer border-b border-white/2 uppercase"
                      >
                        {p.name_uz}
                      </div>
                    ))}
                  {filteredProducts.filter(p => p.name_uz.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="px-6 py-4 text-xs text-gray-500 font-bold uppercase">{t('not_found', 'Topilmadi')}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {formData.category_id && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4 p-5 bg-white/2 border border-white/5 rounded-4xl">
              {isTekstil ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase flex items-center gap-1 tracking-wide">
                      <Ruler size={10}/> {t('width_m')}
                    </label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={formData.width_m} 
                      onChange={e => setFormData({...formData, width_m: e.target.value})} 
                      className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-bold outline-none focus:border-primary" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-1 pl-4 border-l border-white/5">
                    <label className="text-[9px] font-bold text-primary uppercase flex items-center gap-1 tracking-wide">
                      <Ruler size={10}/> {t('length_m')}
                    </label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={formData.length_m} 
                      onChange={e => setFormData({...formData, length_m: e.target.value})} 
                      className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-bold outline-none focus:border-primary" 
                      placeholder="0.00" 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">{t('length_m')}</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={formData.length_m} 
                      onChange={e => setFormData({...formData, length_m: e.target.value})} 
                      className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-bold outline-none focus:border-blue-400" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-1 pl-4 border-l border-white/5">
                    <label className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">{t('count_pcs')}</label>
                    <input 
                      required 
                      type="number" 
                      value={formData.item_count} 
                      onChange={e => setFormData({...formData, item_count: e.target.value})} 
                      className="w-full bg-transparent border-b border-white/10 py-2 text-white text-xl font-bold outline-none focus:border-blue-400" 
                      placeholder="1" 
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-500 uppercase ml-2 tracking-wide">{t('tan_narx')} ($)</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={formData.purchase_price} 
                onChange={e => setFormData({...formData, purchase_price: e.target.value})} 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-emerald-500 font-bold outline-none text-lg" 
                placeholder="0.00" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase ml-2 tracking-wide">{t('sotuv_narxi')} ($)</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={formData.selling_price} 
                onChange={e => setFormData({...formData, selling_price: e.target.value})} 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-bold outline-none text-lg" 
                placeholder="0.00" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wide">{t('batch_no')}</label>
              <div className="flex items-center px-5 py-4 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-gray-400 font-bold mr-2 italic">P-</span>
                <input 
                  required 
                  type="number" 
                  value={formData.batch_number} 
                  onChange={e => setFormData({...formData, batch_number: e.target.value})} 
                  className="bg-transparent border-none text-white font-bold outline-none w-full" 
                  placeholder="1" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-rose-500 uppercase ml-2 flex items-center gap-1 tracking-wide">
                <AlertCircle size={12}/> {t('limit')}
              </label>
              <input 
                required 
                type="number" 
                value={formData.min_limit} 
                onChange={e => setFormData({...formData, min_limit: e.target.value})} 
                className="w-full px-5 py-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-500 font-bold outline-none text-lg" 
                placeholder="5" 
              />
            </div>
          </div>

          <div className="p-6 bg-primary/10 border border-primary/20 rounded-4xl text-center">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">{t('total_inbound_qty')}</p>
            <h4 className="text-4xl font-bold text-white tracking-tighter italic">
              {calculateTotal().toFixed(2)} <span className="text-sm not-italic opacity-40 uppercase ml-1">{isTekstil ? t('sq_m') : t('meter')}</span>
            </h4>
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full py-5 bg-primary text-black font-bold rounded-3xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-wide text-xs flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18}/>} {t('save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}