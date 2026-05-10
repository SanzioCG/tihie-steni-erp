import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Banknote, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: any;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, client }: PaymentModalProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  // Modal yopilganda state cleanup
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error("Summa noto'g'ri!");
      return;
    }
    
    if (!client?.id) {
      toast.error("Mijoz tanlanmagan!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('collect_debt_secure', {
        p_client_id: client.id,
        p_amount: num,
        p_user_name: profile?.full_name || 'Admin',
        p_description: `${client.full_name} qarz to'lovi: $${num.toLocaleString()}`
      });

      if (error) throw error;

      toast.success("To'lov muvaffaqiyatli qabul qilindi!");
      onSuccess();
      onClose();
    } catch (err: any) { 
      toast.error("Xatolik: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-100 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-10"
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
            <p className="text-xs text-rose-500 font-bold">
              Jami qarz: ${Math.abs(Number(client?.balance) || 0).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">To'lov Summasi ($)</label>
            <div className="relative">
                <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input 
                  required 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className="w-full pl-12 pr-5 py-5 bg-primary/5 border border-primary/20 rounded-2xl text-primary text-xl font-black outline-none focus:bg-primary/10 transition-all" 
                  placeholder="0.00" 
                />
            </div>
          </div>

          <button 
            disabled={loading || !amount} 
            type="submit" 
            className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            To'lovni Tasdiqlash
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}