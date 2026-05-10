import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Loader2, Save, Link as LinkIcon, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function AddProductModal({ isOpen, onClose, onSuccess, initialData }: any) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [existingSeries, setExistingSeries] = useState<string[]>([]);
  
  // Rasm boshqaruvi
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const [formData, setFormData] = useState({
    category_id: '', series: '', name_uz: '', sku: '', min_stock: '10'
  });

  const BUCKET_NAME = 'products';

  useEffect(() => {
    const init = async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('name_uz');
      if (cats) setCategories(cats);

      const { data: prods } = await supabase.from('products').select('series');
      if (prods) {
        setExistingSeries(Array.from(new Set(prods.map(p => p.series).filter(Boolean))));
      }

      if (initialData) {
        setFormData({
          category_id: initialData.category_id || '',
          series: initialData.series || '',
          name_uz: initialData.name_uz || '',
          sku: initialData.sku || '',
          min_stock: initialData.min_stock?.toString() || '10'
        });
        setImagePreview(initialData.image_url || null);
        if (initialData.image_url && !initialData.image_url.includes('supabase')) {
            setImageUrl(initialData.image_url);
        }
      } else {
        setFormData({ category_id: cats?.[0]?.id || '', series: '', name_uz: '', sku: '', min_stock: '10' });
        setImagePreview(null); setImageUrl(''); setImageFile(null);
      }
    };
    if (isOpen) init();
  }, [isOpen, initialData]);

  // 🟢 Storage-dan faylni toza o'chirish
  const deleteFromStorage = async (url: string) => {
    if (!url || !url.includes('supabase')) return;
    try {
      const fileName = url.split('?')[0].split('/').pop();
      if (fileName) {
        await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        console.log("Eski rasm Storage-dan o'chirildi:", fileName);
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageUrl(''); 
    }
  };

  const handleUrlChange = (val: string) => {
    setImageUrl(val);
    setImagePreview(val);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = initialData?.image_url || '';

      // 🟢 1. AGAR YANGI FAYL YUKLANYOTGAN BO'LSA
      if (imageFile) {
        // Eski faylni fonda o'chiramiz
        if (initialData?.image_url) {
            deleteFromStorage(initialData.image_url);
        }

        const fileExt = imageFile.name.split('.').pop();
        // UNIKAL NOM: product_vaqt_random.ext (404 xatosini oldini oladi)
        const uniqueName = `prod_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: upErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(uniqueName, imageFile, { 
            cacheControl: '0', 
            upsert: false 
          });

        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueName);
        finalImageUrl = urlData.publicUrl;
      } 
      // 🟢 2. AGAR URL KIRITILGAN BO'LSA
      else if (imageUrl && imageUrl !== initialData?.image_url) {
        if (initialData?.image_url?.includes('supabase')) {
            deleteFromStorage(initialData.image_url);
        }
        finalImageUrl = imageUrl;
      }

      const saveData = {
        category_id: formData.category_id,
        series: formData.series,
        name_uz: formData.name_uz,
        name_ru: formData.name_uz,
        name_en: formData.name_uz,
        sku: formData.sku,
        image_url: finalImageUrl,
        min_stock: Number(formData.min_stock)
      };

      const { error } = initialData 
        ? await supabase.from('products').update(saveData).eq('id', initialData.id)
        : await supabase.from('products').insert([saveData]);

      if (error) throw error;

      toast.success(initialData ? "Ma'lumotlar yangilandi" : "Yangi mahsulot qo'shildi");
      onSuccess(); onClose();
    } catch (err: any) { 
      toast.error("Xatolik: " + err.message); 
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl bg-[#0c0c0e] border border-white/10 rounded-4xl shadow-2xl p-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            {initialData ? "Mahsulotni tahrirlash" : "Yangi Mahsulot Pasporti"}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={22}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="flex items-center gap-6 p-6 bg-white/2 border border-white/5 rounded-[2rem]">
            <label className="relative w-32 h-32 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-all group shrink-0 shadow-inner">
                {imagePreview ? (
                    <img 
                      key={imagePreview} // KEY qo'shish rasm o'zgarganda DOMni yangilaydi
                      src={imagePreview.includes('supabase') ? `${imagePreview}?t=${Date.now()}` : imagePreview} 
                      className="w-full h-full object-cover animate-in fade-in duration-300" 
                      alt="Preview" 
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-700 group-hover:text-primary transition-colors">
                        <Camera size={32} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Rasm yuklash</span>
                    </div>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>

            <div className="flex-1 space-y-3 text-left">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tashqi rasm havolasi (URL)</label>
                <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                    <input 
                      value={imageUrl} 
                      onChange={e => handleUrlChange(e.target.value)} 
                      placeholder="https://..." 
                      className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-[11px] outline-none focus:border-primary/30 font-black uppercase" 
                    />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">1. Kategoriya</label>
              <select required value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none appearance-none uppercase text-sm focus:border-primary/20">
                <option value="" className="bg-black">Tanlang...</option>
                {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">2. Seriya</label>
              <input list="series-data" required value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 uppercase text-sm" placeholder="Masalan: Komfort" />
              <datalist id="series-data">{existingSeries.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">3. Mahsulot Nomi</label>
              <input required value={formData.name_uz} onChange={e => setFormData({...formData, name_uz: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 uppercase text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">4. Mahsulot ID (SKU)</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-mono font-black outline-none focus:border-primary/30 uppercase text-sm" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-white/5">
            <button type="button" onClick={onClose} className="px-6 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Bekor qilish</button>
            <button disabled={loading} type="submit" className="px-14 py-4 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 uppercase text-[10px] tracking-[0.2em] shadow-primary/10">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Saqlash Ma'lumotni
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}