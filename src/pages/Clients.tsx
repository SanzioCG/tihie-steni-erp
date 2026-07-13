import { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
  Search, Plus, User, Loader2, Edit2,
  Trash2, FileDown, X, History, ShoppingBag,
  RotateCcw, Banknote, Filter, TrendingUp, Package, Award,
  MessageSquarePlus, MessageSquare, CheckSquare, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AddClientModal from '../components/modals/AddClientModal';
import { exportToPDF, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useClients, useClientStats } from '../hooks/queries/useClients';

type FilterMode = 'all' | 'debtors' | 'top';

export default function Clients() {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const EMPTY_INTERACTION = { type: 'call', direction: 'outgoing', subject: '', notes: '', outcome: '', followup_title: '', followup_due: '' };
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [interactionForm, setInteractionForm] = useState(EMPTY_INTERACTION);

  const { data: clients = [], isLoading: loading, refetch: fetchClients } = useClients();
  const { data: clientStats = {} } = useClientStats();

  const openHistory = async (client: any) => {
    setViewingHistory(client);
    setShowInteractionForm(false);
    setInteractionForm(EMPTY_INTERACTION);
    setSummaryLoading(true);
    setSummary(null);

    const { data, error } = await supabase.rpc('get_client_summary', {
      p_client_id: client.id
    });

    if (!error && data) {
      setSummary(data);
    }
    setSummaryLoading(false);
  };

  const refreshSummary = async (clientId: string) => {
    const { data, error } = await supabase.rpc('get_client_summary', { p_client_id: clientId });
    if (!error && data) setSummary(data);
  };

  const logInteraction = async () => {
    if (!viewingHistory) return;
    setSavingInteraction(true);
    try {
      const { error } = await supabase.rpc('log_interaction', {
        p_client_id: viewingHistory.id,
        p_type: interactionForm.type,
        p_direction: interactionForm.direction || null,
        p_subject: interactionForm.subject || null,
        p_notes: interactionForm.notes || null,
        p_outcome: interactionForm.outcome || null,
        p_followup_title: interactionForm.followup_title || null,
        p_followup_due: interactionForm.followup_due ? new Date(interactionForm.followup_due).toISOString() : null,
      });
      if (error) throw error;

      toast.success(t('interaction_saved'));
      setInteractionForm(EMPTY_INTERACTION);
      setShowInteractionForm(false);
      await refreshSummary(viewingHistory.id);
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    } finally {
      setSavingInteraction(false);
    }
  };

  const handleExportPDF = () => {
    const headers = [["MIJOZ", "TELEFON", "TURI", t('turnover'), "BALANS"]];
    const dataRows = filteredClients.map((c: any) => [
      c.full_name, 
      c.phone || '-', 
      c.client_type, 
      convert(clientStats[c.id] || 0),
      convert(c.balance)
    ]);
    exportToPDF("Mijozlar_Bazasi", headers, dataRows);
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter((c: any) => 
      c.full_name.toLowerCase().includes(search.toLowerCase())
    );
    
    if (filterMode === 'debtors') {
      result = result.filter((c: any) => Number(c.balance) < 0);
    }
    
    if (filterMode === 'top') {
      result = result
        .filter((c: any) => clientStats[c.id] > 0)
        .sort((a: any, b: any) => (clientStats[b.id] || 0) - (clientStats[a.id] || 0));
    }
    
    return result;
  }, [clients, search, filterMode, clientStats]);

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

      {/* FILTER + SEARCH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mx-2">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
          <input 
            type="text" 
            placeholder={t('search_client_placeholder')} 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-2xl text-white outline-none focus:border-primary/40 transition-all shadow-2xl font-black"
          />
        </div>

        <div className="flex gap-2 bg-[#0c0c0e] border border-white/5 rounded-2xl p-2">
          {([
            { id: 'all', label: t('all'), icon: Filter },
            { id: 'debtors', label: t('debtors'), icon: Banknote },
            { id: 'top', label: t('top'), icon: TrendingUp },
          ] as const).map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  filterMode === f.id ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"
                )}
              >
                <Icon size={14} />
                {f.label}
              </button>
            );
          })}
        </div>
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
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">{t('turnover')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">{t('balance_label')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/2">
              {filteredClients.map((c: any) => (
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
                  <td onClick={() => openHistory(c)} className="px-8 py-5 text-center font-black text-sm tracking-tighter text-white">
                    {convert(clientStats[c.id] || 0)}
                  </td>
                  <td onClick={() => openHistory(c)} className="px-8 py-5 text-center font-black text-sm tracking-tighter">
                    <span className={cn(Number(c.balance) < 0 ? "text-rose-500" : Number(c.balance) > 0 ? "text-emerald-500" : "text-gray-500")}>
                        {Number(c.balance) < 0 ? `-${convert(Math.abs(c.balance))}` : convert(c.balance)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setIsModalOpen(true); }} className="p-2.5 bg-white/5 text-gray-500 hover:text-primary rounded-xl border border-white/5"><Edit2 size={15}/></button>
                       <button onClick={(e) => { e.stopPropagation(); if(window.confirm(t('confirm_delete'))) supabase.from('clients').delete().eq('id', c.id).then(() => fetchClients()) }} className="p-2.5 bg-white/5 text-gray-500 hover:text-rose-500 rounded-xl border border-white/5"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-700 font-black uppercase text-[10px] tracking-widest">{t('no_data')}</td>
                </tr>
              )}
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
              className="relative w-full max-w-4xl bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-8 md:p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button onClick={() => setViewingHistory(null)} className="absolute right-8 top-8 p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all z-10"><X size={24}/></button>
              
              <div className="flex items-center gap-6 mb-8">
                 <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><User size={32} strokeWidth={3} /></div>
                 <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{viewingHistory.full_name}</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{viewingHistory.phone || t('unknown_phone')} • {viewingHistory.client_type}</p>
                 </div>
              </div>

              {summaryLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : summary ? (
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label={t('gross_turnover')} value={convert(summary.stats.grossSales)} color="text-white" />
                    <StatCard label={t('net_turnover')} value={convert(summary.stats.netRevenue)} color="text-primary" />
                    <StatCard label={t('returned')} value={convert(summary.stats.returnsTotal)} color="text-amber-500" />
                    <StatCard 
                      label={t('balance')} 
                      value={Number(summary.stats.balance) < 0 ? `-${convert(Math.abs(summary.stats.balance))}` : convert(summary.stats.balance)} 
                      color={Number(summary.stats.balance) < 0 ? "text-rose-500" : "text-emerald-500"} 
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 bg-white/3 border border-white/5 rounded-3xl">
                    <InfoItem icon={ShoppingBag} label={t('sales_count')} value={`${summary.stats.salesCount} ta`} />
                    <InfoItem icon={TrendingUp} label={t('avg_check')} value={convert(summary.stats.avgCheck)} />
                    <InfoItem icon={Award} label={t('top_product')} value={summary.stats.topProduct || '—'} />
                  </div>

                  {/* MULOQOT QO'SHISH (CRM) */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <MessageSquare size={14} strokeWidth={3} /> {t('add_interaction')}
                      </h4>
                      <button onClick={() => setShowInteractionForm(v => !v)} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-primary transition-all">
                        {showInteractionForm ? <X size={16} /> : <MessageSquarePlus size={16} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showInteractionForm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="p-5 bg-white/3 border border-white/5 rounded-3xl space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField label={t('interaction_type')} value={interactionForm.type} onChange={(v) => setInteractionForm({ ...interactionForm, type: v })} options={[['call', t('type_call')], ['meeting', t('type_meeting')], ['message', t('type_message')], ['note', t('type_note')], ['visit', t('type_visit')]]} />
                              <SelectField label={t('interaction_direction')} value={interactionForm.direction} onChange={(v) => setInteractionForm({ ...interactionForm, direction: v })} options={[['outgoing', t('dir_outgoing')], ['incoming', t('dir_incoming')]]} />
                            </div>

                            <TextField label={t('interaction_subject')} value={interactionForm.subject} onChange={(v) => setInteractionForm({ ...interactionForm, subject: v })} />

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('interaction_note')}</label>
                              <textarea rows={2} value={interactionForm.notes} onChange={(e) => setInteractionForm({ ...interactionForm, notes: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 resize-none" />
                            </div>

                            <SelectField label={t('outcome_label')} value={interactionForm.outcome} onChange={(v) => setInteractionForm({ ...interactionForm, outcome: v })} options={[['', '—'], ['answered', t('outcome_answered')], ['no_answer', t('outcome_no_answer')], ['callback', t('outcome_callback')], ['deal', t('outcome_deal')], ['rejected', t('outcome_rejected')], ['info', t('outcome_info')]]} />

                            <div className="pt-3 border-t border-white/5 space-y-3">
                              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{t('follow_up')}</p>
                              <div className="grid grid-cols-2 gap-3">
                                <TextField label={t('follow_up_title')} value={interactionForm.followup_title} onChange={(v) => setInteractionForm({ ...interactionForm, followup_title: v })} />
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('follow_up_date')}</label>
                                  <input type="datetime-local" value={interactionForm.followup_due} onChange={(e) => setInteractionForm({ ...interactionForm, followup_due: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30" />
                                </div>
                              </div>
                            </div>

                            <button onClick={logInteraction} disabled={savingInteraction || !interactionForm.type} className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                              {savingInteraction ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {t('save_interaction')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <History size={14} strokeWidth={3} /> Operatsiyalar tarixi
                    </h4>
                    
                    {summary.timeline.length > 0 ? (
                      <div className="space-y-2">
                        {summary.timeline.map((event: any) => (
                          <TimelineItem 
                            key={`${event.event_type}-${event.id}`}
                            event={event}
                            convert={convert}
                            language={i18n.language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 opacity-20">
                        <Package size={48} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Operatsiyalar yo'q</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 opacity-30">
                  <p className="text-sm font-black uppercase">Ma'lumot yo'q</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchClients} initialData={selectedClient} />
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="p-4 bg-white/3 border border-white/5 rounded-2xl">
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={cn("text-xl font-black tracking-tighter", color)}>{value}</p>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-white/5 rounded-lg text-primary"><Icon size={16} /></div>
      <div>
        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-black text-white mt-0.5 truncate max-w-[150px]">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ event, convert, language }: any) {
  const config = {
    sale: {
      icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
      label: event.status === 'completed' ? 'Sotuv' : 'Qarzga sotuv',
      statusLabel: event.status === 'completed' ? "TO'LANGAN" : "QARZ", sign: '+', showAmount: true,
    },
    income: {
      icon: Banknote, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
      label: 'Kirim', statusLabel: "TO'LANDI", sign: '+', showAmount: true,
    },
    expense: {
      icon: RotateCcw, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
      label: 'Chiqim', statusLabel: 'CHIQIM', sign: '-', showAmount: true,
    },
    interaction: {
      icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20',
      label: 'Muloqot', statusLabel: String(event.status || '').toUpperCase(), sign: '', showAmount: false,
    },
    task: {
      icon: CheckSquare, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
      label: 'Vazifa', statusLabel: String(event.status || '').toUpperCase(), sign: '', showAmount: false,
    },
  }[event.event_type as 'sale' | 'income' | 'expense' | 'interaction' | 'task'];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={cn("flex justify-between items-center p-4 rounded-2xl border", config.bg, config.border)}>
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-lg bg-white/5", config.color)}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-black text-white uppercase tracking-tight">{event.title}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
            {config.label} • {new Date(event.created_at).toLocaleString(language)}
          </p>
        </div>
      </div>
      <div className="text-right">
        {config.showAmount && (
          <p className={cn("text-base font-black tracking-tighter", config.color)}>
            {config.sign}
            {convert(Math.abs(Number(event.amount)))}
          </p>
        )}
        {config.statusLabel && (
          <span className={cn("inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded mt-1 max-w-[140px] truncate", config.color, 'bg-white/5')}>
            {config.statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 appearance-none">
        {options.map(([val, name]: [string, string]) => (
          <option key={val} value={val} className="bg-[#0c0c0e]">{name}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30" />
    </div>
  );
}