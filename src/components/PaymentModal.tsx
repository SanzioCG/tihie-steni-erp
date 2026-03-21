import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Banknote, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';

export default function PaymentModal({ isOpen, onClose, onSuccess, client }: any) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);

    try {
      // 1. Mijoz balansini yangilash (balansga pul qo'shamiz)
      const { error: balanceErr } = await supabase
        .from('clients')
        .update({ balance: Number(client.balance) + Number(amount) })
        .eq('id', client.id);

      if (balanceErr) throw balanceErr;

      // 2. Tranzaksiyalarga yozish
      await supabase.from('transactions').insert([{
        type: 'income',
        amount: Number(amount),
        category: 'debt_payment',
        description: `${client.full_name} qarz to'lovi`
      }]);

      onSuccess();
      onClose();
      setAmount('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-[400px] bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-10"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 font-bold text-white italic">
            <Banknote className="text-primary" /> To'lov Qabul Qilish
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Mijoz</p>
            <p className="text-lg font-black text-white">{client?.full_name}</p>
            <p className="text-xs text-rose-500 font-bold">Jami qarz: ${Math.abs(client?.balance).toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">To'lov Summasi ($)</label>
            <div className="relative">
                <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} 
                className="w-full pl-12 pr-5 py-5 bg-primary/5 border border-primary/20 rounded-2xl text-primary text-xl font-black outline-none focus:bg-primary/10 transition-all" placeholder="0.00" />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            To'lovni Tasdiqlash
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}