import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Plus, User, Phone, Loader2, Edit2, 
  Trash2, FileDown, X, History, ShoppingBag, 
  ArrowUpRight, CheckCircle2, Package 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddClientModal from './AddClientModal';
import { exportToPDF, cn } from '../utils';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';

export default function Clients() {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [clientSales, setClientSales] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openHistory = async (client: any) => {
    setViewingHistory(client);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('*, products(name_uz, sku)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });
    
    if (data) setClientSales(data);
    setHistoryLoading(false);
  };

  const handleExportPDF = () => {
    const headers = [[t('client').toUpperCase(), t('phone').toUpperCase(), t('category').toUpperCase(), t('balance_label').toUpperCase()]];
    const dataRows = clients.map(c => [
      c.full_name, 
      c.phone || '-', 
      c.client_type, 
      convert(c.balance)
    ]);
    exportToPDF("Mijozlar_Bazasi", headers, dataRows);
  };

  const filtered = clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 text-left text-app-fg font-sans animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-white">{t('clients_database')}</h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">{t('crm_subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportPDF} className="px-6 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">
            <FileDown size={18} className="text-primary" /> {t('pdf_export')}
          </button>
          <button onClick={() => { setSelectedClient(null); setIsModalOpen(true); }} className="px-8 py-4 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Plus size={20} strokeWidth={3} /> {t('add_client')}
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
        <input 
          type="text" placeholder={t('search_client_placeholder')} 
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-2xl font-black"
        />
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-112.5 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-primary border-b border-white/5">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">{t('client_and_type')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">{t('phone')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">{t('balance_label')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/2">
              {filtered.map((c) => (
                <tr key={c.id} className="group hover:bg-white/1 transition-all cursor-pointer">
                  <td onClick={() => openHistory(c)} className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-sm group-hover:bg-primary group-hover:text-black transition-all">
                        {c.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors">{c.full_name}</p>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{c.client_type}</p>
                      </div>
                    </div>
                  </td>
                  <td onClick={() => openHistory(c)} className="px-8 py-5 text-center text-xs font-bold text-gray-500 font-mono">
                    {c.phone || '--'}
                  </td>
                  <td onClick={() => openHistory(c)} className="px-8 py-5 text-center font-black text-sm tracking-tighter">
                    <span className={cn(Number(c.balance) < 0 ? "text-rose-500" : "text-emerald-500")}>
                        {Number(c.balance) < 0 ? `-${convert(Math.abs(c.balance))}` : convert(c.balance)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setIsModalOpen(true); }} className="p-2.5 bg-white/5 text-gray-500 hover:text-primary rounded-xl border border-white/5"><Edit2 size={15}/></button>
                       <button onClick={(e) => { e.stopPropagation(); if(window.confirm(t('confirm_delete'))) supabase.from('clients').delete().eq('id', c.id).then(fetchClients) }} className="p-2.5 bg-white/5 text-gray-500 hover:text-rose-500 rounded-xl border border-white/5"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MIJOZ TARIXI MODAL */}
      <AnimatePresence>
        {viewingHistory && (
          <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setViewingHistory(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <button onClick={() => setViewingHistory(null)} className="absolute right-8 top-8 p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={24}/></button>
              <div className="flex items-center gap-6 mb-10 text-left">
                 <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner"><User size={32} strokeWidth={3} /></div>
                 <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{viewingHistory.full_name}</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{viewingHistory.phone || t('unknown_phone')}</p>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><History size={14} strokeWidth={3} /> {t('sales_payments_history')}</h4>
                 {historyLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
                   <div className="space-y-3">
                      {clientSales.map((item) => (
                        <div key={item.id} className="p-5 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-center group transition-all">
                           <div className="flex items-start gap-4 text-left">
                              <div className="p-2 bg-white/5 rounded-lg text-gray-500"><ShoppingBag size={18}/></div>
                              <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">{item.products?.name_uz || t('products')}</p>
                                <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(item.created_at).toLocaleString(i18n.language)}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-base font-black text-white tracking-tighter">{convert(item.total_amount)}</p>
                              <div className={cn("inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded border mt-1.5", item.status === 'completed' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5")}>
                                {item.status === 'completed' ? t('paid') : t('debt')}
                              </div>
                           </div>
                        </div>
                      ))}
                      {clientSales.length === 0 && <div className="text-center py-20 opacity-20"><Package size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('no_purchases_yet')}</p></div>}
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchClients} initialData={selectedClient} />
    </div>
  );
}