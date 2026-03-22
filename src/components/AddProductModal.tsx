import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, FolderOpen, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next'; // Til hookini import qildik

export default function AddProductModal({ isOpen, onClose, onSuccess, initialData }: any) {
  const { t } = useTranslation(); // t funksiyasini chaqirdik
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    series: '', name_uz: '', attribute: '',
    sku: '', category_id: '', unit: 'pcs', min_stock: '10'
  });

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);

      if (initialData) {
        setFormData({
          series: initialData.series || '',
          name_uz: initialData.name_uz || '',
          attribute: initialData.attribute || '',
          sku: initialData.sku || '',
          category_id: initialData.category_id || '',
          unit: initialData.unit || 'pcs',
          min_stock: initialData.min_stock?.toString() || '10'
        });
        setImagePreview(initialData.image_url);
      } else {
        setFormData({ 
          series: '', name_uz: '', attribute: '',
          sku: '', category_id: data?.[0]?.id || '', unit: 'pcs', min_stock: '10' 
        });
        setImagePreview(null);
        setImageFile(null);
      }
    };
    if (isOpen) init();
  }, [isOpen, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = imagePreview;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: upErr } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile, { upsert: true });

        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
        finalImageUrl = urlData.publicUrl;
      }

      const saveData = {
        series: formData.series,
        name_uz: formData.name_uz,
        name_ru: formData.name_uz,
        name_en: formData.name_uz,
        attribute: formData.attribute,
        sku: formData.sku,
        category_id: formData.category_id,
        unit: formData.unit,
        image_url: finalImageUrl,
        min_stock: Number(formData.min_stock)
      };

      const { error } = initialData 
        ? await supabase.from('products').update(saveData).eq('id', initialData.id)
        : await supabase.from('products').insert([saveData]);

      if (error) throw error;

      // ==========================================
      // 👇 AUDIT LOG QISMI (SHU YERGA QO'SHILDI)
      // ==========================================
      await supabase.from('audit_logs').insert([{
        action: initialData ? 'UPDATED' : 'CREATED',
        entity: 'MAHSULOT',
        details: `${initialData ? 'Mahsulot tahrirlandi' : 'Yangi mahsulot qo\'shildi'}: ${formData.name_uz}`,
        user_name: 'Admin'
      }]);
      // ==========================================

      onSuccess();
      onClose();
    } catch (err: any) { 
      console.error(err);
      alert(t('error') + ": " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-999 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative my-auto w-full max-w-[650px] bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-8 md:p-10"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 font-bold text-white tracking-tight italic">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#34d399]" />
            {initialData ? t('edit') : t('add_product')} {/* Tarjima ulandi */}
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* IMAGE SECTION */}
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-gray-700" />
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1e] border border-white/5 rounded-xl text-[11px] font-bold text-gray-300 hover:bg-white/5 cursor-pointer transition-all">
                <FolderOpen size={14} className="text-amber-500" />
                <span>{t('select_product', 'Rasm tanlash')}</span> {/* Tarjima ulandi */}
                <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
              </label>
              <p className="text-[9px] text-gray-700 uppercase font-bold tracking-widest italic">JPG, PNG, WEBP • Max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2">
               <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">{t('sku', 'Seriya')}</label>
               <input value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})} className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white outline-none focus:border-primary/30" />
             </div>
             <div className="space-y-2">
               <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">{t('products', 'Nomi')}</label>
               <input required value={formData.name_uz} onChange={e => setFormData({...formData, name_uz: e.target.value})} className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white outline-none focus:border-primary/30" />
             </div>
             <div className="space-y-2">
               <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">{t('status', 'Rang')}</label>
               <input value={formData.attribute} onChange={e => setFormData({...formData, attribute: e.target.value})} className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white outline-none focus:border-primary/30" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">{t('category')}</label>
              <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white outline-none focus:border-primary/30">
                {categories.map(c => <option key={c.id} value={c.id} className="bg-[#0c0c0e]">{c.name_uz}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">SKU</label>
              <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
            <button type="button" onClick={onClose} className="px-8 py-3 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest">{t('cancel')}</button>
            <button disabled={loading} type="submit" className="px-10 py-4 bg-primary text-black font-extrabold rounded-xl shadow-lg hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest text-[11px]">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {initialData ? t('confirm') : t('save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}