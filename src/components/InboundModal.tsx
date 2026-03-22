import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Search, ChevronDown, Check, Package, Ruler, Palette, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: any; 
  editData?: any;       
}

export default function InboundModal({ isOpen, onClose, onSuccess, initialProduct, editData }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    product_id: '',
    batch_number: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    height: '',
    width: '',
    length: '',
    color_name: '',
    min_limit: '' // FOYDALANUVCHI KIRITISHI UCHUN BO'SH QOLDIRILDI
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from('products').select('*, categories(id, name_uz)');
      const { data: w } = await supabase.from('warehouses').select('id, name_uz');
      if (p) setProducts(p);
      if (w) setWarehouses(w);

      if (editData) {
        const onlyNumber = editData.batch_number ? editData.batch_number.replace(/\D/g, '') : '';
        setFormData({
          warehouse_id: editData.warehouse_id,
          product_id: editData.product_id,
          batch_number: onlyNumber,
          quantity: editData.quantity.toString(),
          purchase_price: editData.purchase_price.toString(),
          selling_price: (editData.selling_price || 0).toString(),
          height: editData.height?.toString() || '',
          width: editData.width?.toString() || '',
          length: editData.length?.toString() || '',
          color_name: editData.color_name || '',
          min_limit: editData.min_limit?.toString() || ''
        });
      } else {
        setFormData({
          warehouse_id: w?.[0]?.id || '', product_id: initialProduct?.id || '', 
          batch_number: '', quantity: '', purchase_price: '', selling_price: '',
          height: '', width: '', length: '', color_name: '', min_limit: ''
        });
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, editData, initialProduct]);

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const isTekstil = selectedProduct?.categories?.name_uz?.toLowerCase().includes('tekstil');
  const isProfil = selectedProduct?.categories?.name_uz?.toLowerCase().includes('profil');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.batch_number || !formData.min_limit) {
      alert("Iltimos, barcha maydonlarni, jumladan minimal limitni ham to'ldiring!");
      return;
    }

    setLoading(true);
    try {
      const fullBatchNumber = `P-${formData.batch_number}`;
      
      const payload = {
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        batch_number: fullBatchNumber,
        quantity: Number(formData.quantity),
        remaining_quantity: Number(formData.quantity),
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        min_limit: Number(formData.min_limit), // FOYDALANUVCHI KIRITGAN RAQAM SAQLANADI
        height: isTekstil ? Number(formData.height) : null,
        width: isTekstil ? Number(formData.width) : null,
        length: isProfil ? Number(formData.length) : null,
        color_name: isProfil ? formData.color_name : null,
      };

      if (editData?.id) {
        await supabase.from('batches').update(payload).eq('id', editData.id);
      } else {
        await supabase.from('batches').insert([payload]);
      }

      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-xl bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                {editData ? 'Zaxirani tahrirlash' : 'Yangi kirim qilish'}
              </h3>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* OMBOR VA MAHSULOT QISMI */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Ombor</label>
                  <select required value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none">
                    {warehouses.map(w => <option key={w.id} value={w.id} className="bg-black">{w.name_uz}</option>)}
                  </select>
                </div>

                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mahsulot</label>
                  <div onClick={() => !initialProduct && !editData && setIsDropdownOpen(!isDropdownOpen)} className={`w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white flex items-center justify-between cursor-pointer`}>
                    <span className="text-sm font-bold truncate">{selectedProduct ? selectedProduct.name_uz : "Qidirish..."}</span>
                    <ChevronDown size={16} />
                  </div>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-[160] overflow-hidden shadow-2xl">
                      <input autoFocus type="text" className="w-full p-3 bg-white/5 outline-none text-xs text-white" placeholder="Qidirish..." onChange={(e) => setSearchTerm(e.target.value)} />
                      <div className="max-h-40 overflow-y-auto">
                        {products.filter(p => p.name_uz.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => { setFormData({...formData, product_id: p.id}); setIsDropdownOpen(false); }} className="px-4 py-3 hover:bg-primary/10 text-xs text-white cursor-pointer border-b border-white/[0.02] flex justify-between">{p.name_uz} <span className="text-[9px] text-gray-500">{p.categories?.name_uz}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DINAMIK O'LCHAMLAR */}
                {isTekstil && (
                  <div className="col-span-full grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-primary uppercase">Bo'yi (H)</label><input required type="number" step="0.01" className="w-full bg-transparent border-none text-white text-sm outline-none font-bold" placeholder="2.90" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                    <div className="space-y-1 border-l border-white/5 pl-4"><label className="text-[9px] font-bold text-primary uppercase">Eni (W)</label><input required type="number" step="0.01" className="w-full bg-transparent border-none text-white text-sm outline-none font-bold" placeholder="3.25" value={formData.width} onChange={e => setFormData({...formData, width: e.target.value})} /></div>
                  </div>
                )}

                {isProfil && (
                  <div className="col-span-full grid grid-cols-2 gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-blue-400 uppercase">Uzunligi (L)</label><input required type="number" step="0.01" className="w-full bg-transparent border-none text-white text-sm outline-none font-bold" placeholder="2.0" value={formData.length} onChange={e => setFormData({...formData, length: e.target.value})} /></div>
                    <div className="space-y-1 border-l border-white/5 pl-4"><label className="text-[9px] font-bold text-blue-400 uppercase">Rangi</label><input required type="text" className="w-full bg-transparent border-none text-white text-sm outline-none font-bold" placeholder="Oltin" value={formData.color_name} onChange={e => setFormData({...formData, color_name: e.target.value})} /></div>
                  </div>
                )}

                {/* ASOSIY MAYDONLAR */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Partiya №</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-bold">P-</span>
                    <input required type="number" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full pl-10 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-mono" placeholder="1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Miqdor</label>
                  <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Tan Narxi ($)</label>
                  <input required type="number" step="0.01" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-emerald-500 font-mono font-bold outline-none" placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-widest ml-1">Sotish Narxi ($)</label>
                  <input required type="number" step="0.01" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-mono font-bold outline-none" placeholder="0.00" />
                </div>

                {/* ENG MUHIMI: MINIMAL QOLDIQ LIMITI (USER KIRITADI) */}
                <div className="col-span-full p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] space-y-3">
                  <div className="flex items-center gap-2 text-rose-500">
                    <AlertCircle size={16} />
                    <label className="text-[10px] font-black uppercase tracking-widest">Ogohlantirish limiti (User Input)</label>
                  </div>
                  <input 
                    required 
                    type="number" 
                    value={formData.min_limit} 
                    onChange={e => setFormData({...formData, min_limit: e.target.value})} 
                    className="w-full px-6 py-4 bg-white/5 border border-rose-500/20 rounded-2xl text-rose-500 font-black text-xl outline-none text-center focus:bg-rose-500/10 transition-all" 
                    placeholder="Masalan: 5" 
                  />
                  <p className="text-[8px] text-gray-600 font-bold uppercase text-center tracking-tighter">Qoldiq ushbu raqamga yetganda Dashboardda "Kam qolganlar" ro'yxatiga tushadi</p>
                </div>

              </div>

              <button disabled={loading} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Tasdiqlash va Saqlash
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}