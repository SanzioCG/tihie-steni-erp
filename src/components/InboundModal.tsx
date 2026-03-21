import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Package, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: any; // Tanlangan mahsulot (Inventorydan kelsa)
}

export default function InboundModal({ isOpen, onClose, onSuccess, initialProduct }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    product_id: '',
    batch_number: '001',
    quantity: '',
    purchase_price: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from('products').select('id, name_uz');
      const { data: w } = await supabase.from('warehouses').select('id, name_uz');
      if (p) setProducts(p);
      if (w) {
        setWarehouses(w);
        setFormData(prev => ({ 
          ...prev, 
          warehouse_id: w[0]?.id || '',
          product_id: initialProduct?.id || '' 
        }));
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, initialProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('batches').insert([{
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        batch_number: 'P-' + formData.batch_number,
        quantity: Number(formData.quantity),
        purchase_price: Number(formData.purchase_price),
      }]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 'z-110' flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-10">
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#34d399]" />
                <h3 className="text-xl font-bold text-white tracking-tight italic">Yangi kirim</h3>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-xl border border-white/5 text-gray-500 hover:text-white transition-all"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Ombor</label>
                  <select value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none">
                    {warehouses.map(w => <option key={w.id} value={w.id} className="bg-black">{w.name_uz}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mahsulot</label>
                  <select disabled={!!initialProduct} value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none">
                    <option value="">Tanlang</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name_uz}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Partiya №</label>
                  <input required value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-mono" placeholder="001" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Miqdor</label>
                  <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none" placeholder="0" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Tan Narxi ($)</label>
                  <input required type="number" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-mono" placeholder="0.00" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                <button type="button" onClick={onClose} className="px-8 py-3 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest">Bekor</button>
                <button disabled={loading} type="submit" className="px-10 py-4 bg-primary text-black font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all flex items-center gap-2 uppercase tracking-widest text-xs">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Kirimni saqlash
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}