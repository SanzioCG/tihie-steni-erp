import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Search, Wallet, ArrowRightCircle, 
  CheckCircle2, Loader2, User, FileDown, Banknote, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next'; // QO'SHILDI
import { generatePDF } from '../utils/exportPDF';
import { cn } from '../lib/utils';

export default function Debts() {
  const { t, i18n } = useTranslation(); // QO'SHILDI
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchDebtors = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').lt('balance', 0).order('balance', { ascending: true });
    if (data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchDebtors(); }, []);

  const handlePayment = async () => {
    if (!selectedClient || !paymentAmount) return;
    setPaying(true);

    try {
      const amount = Number(paymentAmount);
      const newBalance = selectedClient.balance + amount;

      await supabase.from('clients').update({ balance: newBalance }).eq('id', selectedClient.id);

      await supabase.from('transactions').insert([{
        type: 'income',
        category: t('debt_payment_category'), // Tarjima qilindi
        amount: amount,
        description: `${selectedClient.full_name} ${t('paid_debt_desc')}`, // Tarjima qilindi
        created_at: new Date().toISOString()
      }]);

      await supabase.from('audit_logs').insert([{
        action: 'UPDATED',
        entity: 'MIJOZ',
        details: `${selectedClient.full_name} $${amount} ${t('paid_debt_desc')}.`,
        user_name: 'Admin'
      }]);

      setSelectedClient(null);
      setPaymentAmount('');
      fetchDebtors();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  const exportDebtsPDF = () => {
    // PDF Headerlari tarjima qilindi
    const headers = [[t('client'), t('phone'), t('debts_label')]];
    const dataRows = clients.map(c => [
      c.full_name,
      c.phone || '-',
      `$${Math.abs(c.balance).toLocaleString()}`
    ]);
    generatePDF(t('debts_control'), headers, dataRows);
  };

  const totalDebt = clients.reduce((sum, c) => sum + Math.abs(c.balance), 0);

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black text-white uppercase ">{t('debts_control')}</h2>
          <p className="text-sm text-gray-500 italic">{t('manage_debtors')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportDebtsPDF} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all font-bold text-xs uppercase">
            <FileDown size={18} /> {t('pdf_export')}
          </button>
        </div>
      </div>

      {/* JAMI QARZ VIDJETI */}
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] backdrop-blur-md flex items-center justify-between mx-2">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-500"><Wallet size={32} /></div>
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('total_debtors_sum')}:</p>
            <p className="text-3xl font-black text-white tracking-tighter">${totalDebt.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[10px] font-bold text-gray-500 uppercase">{t('debtors_count')}:</p>
           <p className="text-xl font-black text-white">{clients.length} {t('unit_pcs')}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
        <input 
          type="text" placeholder={t('search_debtor_placeholder')} 
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-rose-500/30 transition-all font-black"
        />
      </div>

      {/* DEBTORS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-2">
        {clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase())).map((client) => (
          <div key={client.id} className="p-6 bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-2xl hover:border-rose-500/30 transition-all group">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <User size={24} />
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-gray-500 uppercase">{t('debt_label')}:</p>
                  <p className="text-xl font-black text-rose-500 italic">-${Math.abs(client.balance).toLocaleString()}</p>
               </div>
            </div>
            <h4 className="text-lg font-bold text-white mb-1 uppercase">{client.full_name}</h4>
            <p className="text-[10px] text-gray-600 font-bold mb-6 uppercase tracking-widest">{client.phone || t('no_contact')}</p>
            
            <button 
              onClick={() => setSelectedClient(client)}
              className="w-full py-4 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 font-black rounded-xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              <ArrowRightCircle size={16} /> {t('accept_payment')}
            </button>
          </div>
        ))}
        {clients.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-gray-700 font-black uppercase text-[10px] tracking-widest">{t('no_data')}</div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedClient(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-100 bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-6"
            >
              <button onClick={() => setSelectedClient(null)} className="absolute right-6 top-6 text-gray-500"><X size={20}/></button>
              <div className="text-center">
                 <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{selectedClient.full_name}</h3>
                 <p className="text-xs text-rose-500 font-bold uppercase mt-1">{t('available_debt')}: ${Math.abs(selectedClient.balance).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('payment_amount_label')} ($)</label>
                 <input 
                   type="number" autoFocus placeholder="0.00" 
                   className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-mono font-bold text-xl outline-none focus:border-emerald-500/40 text-center"
                   value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                 />
              </div>

              <button 
                onClick={handlePayment}
                disabled={paying || !paymentAmount}
                className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} {t('save_payment')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}