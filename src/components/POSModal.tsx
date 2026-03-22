import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, Loader2, CheckCircle2, Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { cn } from '../utils';

export default function POSModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ client_id: '', product_id: '', batch_id: '', quantity: '', selling_price: '', paid_amount: '' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from('products').select('*').order('name_uz', { ascending: true });
      const { data: c } = await supabase.from('clients').select('*').order('full_name');
      if (p) setProducts(p);
      if (c) setClients(c);
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleProductSelect = async (product: any) => {
    setFormData({ ...formData, product_id: product.id, batch_id: '', selling_price: '' });
    setSearchTerm(product.name_uz);
    setIsDropdownOpen(false);
    const { data: b } = await supabase.from('batches').select('*').eq('product_id', product.id).gt('remaining_quantity', 0).order('created_at', { ascending: true });
    if (b) setBatches(b);
  };

  const selectedBatch = batches.find(b => b.id === formData.batch_id);
  const totalSum = Number(formData.quantity) * Number(formData.selling_price);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.batch_id) return alert("Mijoz va mahsulotni tanlang!");
    setLoading(true);

    try {
      const sellQty = Number(formData.quantity);
      if (selectedBatch.remaining_quantity < sellQty) throw new Error("Omborda yetarli emas!");

      // 1. Ombor qoldig'ini ayirish
      await supabase.from('batches').update({ remaining_quantity: selectedBatch.remaining_quantity - sellQty }).eq('id', selectedBatch.id);

      // 2. MOLIYA JADVALIGA YOZISH (INCOME)
      await supabase.from('transactions').insert([{
        type: 'income',
        category: 'Sotuv',
        amount: totalSum,
        description: `Sotuv: ${searchTerm} (${sellQty} ta)`,
        created_at: new Date().toISOString()
      }]);

      // 3. Sotuvlar tarixiga yozish
      await supabase.from('sales').insert([{
        client_id: formData.client_id,
        product_id: formData.product_id,
        total_amount: totalSum,
        total_profit: (Number(formData.selling_price) - selectedBatch.purchase_price) * sellQty,
        quantity: sellQty
      }]);

      // 4. Audit Log
      await supabase.from('audit_logs').insert([{
        action: 'CREATED',
        entity: 'SOTUV',
        details: `${sellQty} ta ${searchTerm} sotildi. Summa: $${totalSum}`,
        user_name: 'Admin'
      }]);

      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-[550px] bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
        <h3 className="text-xl font-black text-white mb-8 italic uppercase tracking-widest flex items-center gap-3"><ShoppingCart className="text-primary"/> Yangi Sotuv</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <select required className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none" onChange={e => setFormData({...formData, client_id: e.target.value})}>
            <option value="" className="bg-black">Mijoz tanlang</option>
            {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
          </select>

          <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white flex justify-between cursor-pointer">
              <span className="text-sm font-bold">{formData.product_id ? searchTerm : "Mahsulot qidirish..."}</span>
              <ChevronDown size={18} />
            </div>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-[150] overflow-hidden">
                <input autoFocus className="w-full p-3 bg-white/5 border-b border-white/5 outline-none text-white text-xs" placeholder="Qidirish..." onChange={e => setSearchTerm(e.target.value)} />
                <div className="max-h-40 overflow-y-auto">
                  {products.filter(p => p.name_uz.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <div key={p.id} onClick={() => handleProductSelect(p)} className="px-4 py-3 hover:bg-primary/10 text-xs text-white cursor-pointer">{p.name_uz}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {batches.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {batches.map(b => (
                <div key={b.id} onClick={() => setFormData({...formData, batch_id: b.id, selling_price: b.selling_price.toString()})}
                  className={cn("p-4 rounded-xl border cursor-pointer flex justify-between", formData.batch_id === b.id ? "border-primary bg-primary/10" : "border-white/5")}>
                  <div className="text-xs font-bold text-white">{b.batch_number} | Qoldiq: {b.remaining_quantity}</div>
                  <div className="text-primary font-black text-xs">${b.selling_price}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <input required type="number" placeholder="Miqdor" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            <input required type="number" placeholder="Summa" className="w-full px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl text-primary font-black outline-none" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
          </div>

          <button type="submit" disabled={loading} className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg uppercase text-xs flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} Yakunlash
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}