import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Loader2, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useCurrencyStore } from '../../store/useCurrencyStore'; 
import { useAuthStore } from '../../store/useAuthStore'; 
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saleData: any;
}

export default function ReturnModal({ isOpen, onClose, onSuccess, saleData }: ReturnModalProps) {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [returnQty, setReturnQty] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');

  // Modal ochilganda qiymatlarni reset qilish
  useEffect(() => {
    if (isOpen) {
      setReturnQty('');
      setRefundAmount('0');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleData) return;
    
    const qty = Number(returnQty);
    const money = Number(refundAmount);

    // Tekshiruv: Sotilgan miqdordan ko'p qaytarib bo'lmaydi
    if (qty <= 0 || qty > saleData.quantity) {
      return toast.error(t('error_qty_limit') || "Xato: Qaytarish miqdori noto'g'ri!");
    }
    
    setLoading(true);
    try {
      // Supabase RPC funksiyasini chaqiramiz (process_product_return)
      // Bu funksiya hamma narsani bitta tranzaksiyada bajaradi
      const { error } = await supabase.rpc('process_product_return', {
        p_sale_id: saleData.id,
        p_batch_id: saleData.batch_id,
        p_client_id: saleData.client_id,
        p_product_id: saleData.product_id,
        p_qty: qty,
        p_refund_amount: money,
        p_user_name: profile?.full_name || 'Admin',
        p_product_name: saleData.products?.name_uz || 'Mahsulot',
        p_category: t('return_category') || 'Vozvrat',
        p_description: `${t('return_category')}: ${saleData.products?.name_uz} qaytarildi`
      });

      if (error) throw error;

      toast.success(t('return_success') || "Mahsulot muvaffaqiyatli qaytarildi!");
      onSuccess();
      onClose();
    } catch (err: any) { 
      console.error("Return error:", err);
      toast.error(t('no_data') + ": " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen || !saleData) return null;

  const isTekstil = saleData.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
  const unit = isTekstil ? 'm²' : 'm';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-sans">
      <AnimatePresence>
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
              <RotateCcw className="text-rose-500" size={24} strokeWidth={3} /> {t('return_title')}
            </h3>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all">
              <X size={20}/>
            </button>
          </div>

          {/* Sotuv haqida qisqacha ma'lumot */}
          <div className="p-6 bg-white/3 border border-white/5 rounded-3xl space-y-3">
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{t('sold_product_label')}</span>
                <span className="text-sm font-bold text-white uppercase truncate">{saleData.products?.name_uz}</span>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                <div>
                   <span className="text-[9px] font-bold text-rose-500 uppercase block mb-1">{t('sold_qty')}</span>
                   <span className="text-sm font-bold text-white italic">{saleData.quantity} {unit}</span>
                </div>
                <div>
                   <span className="text-[9px] font-bold text-primary uppercase block mb-1">{t('total_bill')}</span>
                   <span className="text-sm font-bold text-white italic">{convert(saleData.total_amount)}</span>
                </div>
             </div>
          </div>

          {/* Forma */}
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            
            {/* Qaytarilayotgan miqdor */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-2">
                1. {t('return_qty_label')} ({unit})
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                autoFocus
                value={returnQty} 
                onChange={e => setReturnQty(e.target.value)}
                placeholder="0.00"
                className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-rose-500/40 transition-all text-lg" 
              />
            </div>

            {/* Qaytarilayotgan summa */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-2">
                2. {t('refund_amount_label')} ($)
              </label>
              <div className="relative">
                 <input 
                   required 
                   type="number" 
                   step="0.01" 
                   value={refundAmount} 
                   onChange={e => setRefundAmount(e.target.value)}
                   className="w-full px-6 py-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-500 font-bold text-3xl outline-none focus:border-rose-500/30 text-center" 
                 />
                 <div className="flex items-center justify-center gap-1 mt-3">
                    <AlertCircle size={10} className="text-gray-500" />
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wide">
                      {t('cash_out_warning') || "DIQQAT: BU SUMMA KASSADAN CHIQIM QILINADI"}
                    </p>
                 </div>
              </div>
            </div>

            {/* Submit tugmasi */}
            <button 
              disabled={loading || !returnQty} 
              type="submit" 
              className="w-full py-6 bg-rose-500 text-white font-bold rounded-3xl shadow-lg shadow-rose-500/20 hover:scale-[1.01] active:scale-95 transition-all uppercase text-[11px] tracking-wide flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} strokeWidth={3} />
              )} 
              {t('complete_return')}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}