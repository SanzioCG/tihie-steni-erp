import React, { useState } from 'react';
import { X, RotateCcw, Loader2, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useCurrencyStore } from '../store/useCurrencyStore'; 
import { useAuthStore } from '../store/useAuthStore'; 
import { useTranslation } from 'react-i18next';

export default function ReturnModal({ isOpen, onClose, onSuccess, saleData }: any) {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [returnQty, setReturnQty] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleData) return;
    
    const qty = Number(returnQty);
    const money = Number(refundAmount);

    if (qty > saleData.quantity) {
      return alert(t('error_qty_limit'));
    }
    
    setLoading(true);
    try {
      // 1. OMBORGA QAYTARISH
      if (saleData.batch_id) {
         const { data: bData, error: bErr } = await supabase
           .from('batches')
           .select('remaining_quantity')
           .eq('id', saleData.batch_id)
           .single();
         
         if (bErr) throw bErr;

         await supabase
           .from('batches')
           .update({ remaining_quantity: bData.remaining_quantity + qty })
           .eq('id', saleData.batch_id);
      }

      // 2. MIJOZ BALANSINI TO'G'IRLASH
      const { data: cData, error: cErr } = await supabase
        .from('clients')
        .select('balance')
        .eq('id', saleData.client_id)
        .single();
      
      if (cErr) throw cErr;

      await supabase
        .from('clients')
        .update({ balance: cData.balance + money })
        .eq('id', saleData.client_id);

      // 3. MOLIYA JADVALIGA YOZISH (Chiqim)
      if (money > 0) {
        await supabase.from('transactions').insert([{
          type: 'expense',
          category: t('return_category'),
          amount: money,
          description: `${t('return_category')}: ${saleData.products?.name_uz} ${t('refund_description')}`,
          created_at: new Date().toISOString()
        }]);
      }

      // 4. VOZVRATLAR JADVALIGA YOZISH
      await supabase.from('returns').insert([{
        sale_id: saleData.id,
        product_id: saleData.product_id,
        quantity: qty,
        refund_amount: money,
        created_at: new Date().toISOString()
      }]);

      // 5. AUDIT LOG
      await supabase.from('audit_logs').insert([{
        action: 'DELETED',
        entity: 'SOTUV',
        details: `${saleData.products?.name_uz} ${t('return_audit_details')}: ${qty.toFixed(2)}`,
        user_name: profile?.full_name || 'Admin'
      }]);

      alert(t('return_success'));
      onSuccess();
      onClose();
    } catch (err: any) { 
      alert(t('no_data') + ": " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen || !saleData) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-112.5 bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <RotateCcw className="text-rose-500" size={24} strokeWidth={3} /> {t('return_title')}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        {/* SOTUV MA'LUMOTI */}
        <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-2">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('sold_product_label')}:</p>
           <p className="text-sm font-black text-white uppercase">{saleData.products?.name_uz}</p>
           <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <p className="text-[10px] text-rose-500 font-black uppercase">
                {t('sold_qty')}: {saleData.quantity} {saleData.products?.categories?.name_uz?.toLowerCase().includes('tekstil') ? 'm²' : 'm'}
              </p>
              <p className="text-[10px] text-primary font-black uppercase">
                {t('sotuv_narxi')}: {convert(saleData.total_amount)}
              </p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('return_qty_label')}</label>
            <input 
              required 
              type="number" 
              step="0.01" 
              value={returnQty} 
              onChange={e => setReturnQty(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-rose-500/40 transition-all uppercase" 
              placeholder="0.00" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('refund_amount_label')}</label>
            <div className="relative">
               <input 
                 required 
                 type="number" 
                 step="0.01" 
                 value={refundAmount} 
                 onChange={e => setRefundAmount(e.target.value)}
                 className="w-full px-6 py-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-500 font-black text-2xl outline-none focus:border-rose-500/30 text-center" 
               />
               <p className="text-center text-[9px] text-gray-600 font-black uppercase mt-2 tracking-tighter">{t('cash_out_warning')}</p>
            </div>
          </div>

          <button 
            disabled={loading || !returnQty} 
            type="submit" 
            className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />} 
            {t('complete_return')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}