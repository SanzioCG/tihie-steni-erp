import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, Loader2, User, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

export default function POSModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    product_id: '',
    batch_id: '',
    quantity: '',
    selling_price: '',
    paid_amount: '' // To'langan summa
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from('products').select('*');
      const { data: c } = await supabase.from('clients').select('*').order('full_name');
      if (p) setProducts(p);
      if (c) setClients(c);
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleProductChange = async (productId: string) => {
    setFormData({ ...formData, product_id: productId, batch_id: '', selling_price: '' });
    const { data } = await supabase.from('batches').select('*').eq('product_id', productId).gt('quantity', 0);
    if (data) setBatches(data);
  };

  const totalSum = Number(formData.quantity) * Number(formData.selling_price);
  const debtAmount = totalSum - Number(formData.paid_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) return alert("Mijozni tanlang!");
    setLoading(true);

    try {
      const selectedBatch = batches.find(b => b.id === formData.batch_id);
      const selectedClient = clients.find(c => c.id === formData.client_id);
      
      if (!selectedBatch || selectedBatch.quantity < Number(formData.quantity)) throw new Error("Omborda yetarli yuk yo'q!");

      // 1. Sotuvni qayd etish
      const { error: saleErr } = await supabase.from('sales').insert([{
        client_id: formData.client_id,
        customer_name: selectedClient.full_name,
        total_amount: totalSum,
        paid_amount: Number(formData.paid_amount),
        status: debtAmount <= 0 ? 'completed' : 'pending'
      }]);
      if (saleErr) throw saleErr;

      // 2. Zaxirani kamaytirish
      await supabase.from('batches').update({ quantity: selectedBatch.quantity - Number(formData.quantity) }).eq('id', formData.batch_id);

      // 3. Mijoz balansini (Qarzini) yangilash
      // Balansdan qarzni ayiramiz (minus qilsak qarz bo'ladi)
      await supabase.from('clients').update({ 
        balance: Number(selectedClient.balance || 0) - debtAmount 
      }).eq('id', formData.client_id);

      // 4. Moliyaviy tranzaksiyaga yozish (Kirim)
      if (Number(formData.paid_amount) > 0) {
        await supabase.from('transactions').insert([{
            type: 'income',
            amount: Number(formData.paid_amount),
            category: 'sale',
            description: `${selectedClient.full_name} ga sotuvdan tushum`
        }]);
      }

      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-[550px] bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-10 my-10"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 font-bold text-white tracking-tight italic">
            <ShoppingCart size={22} className="text-primary shadow-[0_0_10px_#34d399]" />
            Yangi Sotuv (POS)
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mijozni tanlang</label>
            <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30 appearance-none">
              <option value="">--- Mijozlar ---</option>
              {clients.map(c => <option key={c.id} value={c.id} className="bg-[#0c0c0e]">{c.full_name} ({c.company_name || 'Shaxsiy'})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mahsulot</label>
              <select required value={formData.product_id} onChange={e => handleProductChange(e.target.value)} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none">
                <option value="">--- Tanlang ---</option>
                {products.map(p => <option key={p.id} value={p.id} className="bg-[#0c0c0e]">{p.name_uz}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Partiya (Sklad)</label>
              <select required value={formData.batch_id} onChange={e => setFormData({...formData, batch_id: e.target.value})} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none">
                <option value="">--- Partiya ---</option>
                {batches.map(b => <option key={b.id} value={b.id} className="bg-[#0c0c0e]">{b.batch_number} (Bor: {b.quantity})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Miqdor</label>
              <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Narxi ($)</label>
              <input required type="number" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none" placeholder="0.00" />
            </div>
          </div>

          {/* TO'LOV BO'LIMI */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Jami Summa:</span>
                <span className="text-xl font-black text-white">${totalSum.toLocaleString()}</span>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-bold text-primary uppercase tracking-widest ml-1">To'langan Summa ($)</label>
                <input required type="number" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} className="w-full px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl text-primary font-black outline-none focus:bg-primary/10 transition-all" placeholder="0.00" />
             </div>
             {debtAmount > 0 && (
                <div className="flex justify-between items-center text-rose-500 animate-pulse">
                    <span className="text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle size={12}/> Qarzga yoziladi:</span>
                    <span className="text-sm font-black">-${debtAmount.toLocaleString()}</span>
                </div>
             )}
          </div>

          <button disabled={loading || !formData.batch_id} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            Savdoni Yakunlash
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}