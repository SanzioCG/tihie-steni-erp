import { useState, useEffect } from 'react';
import { X, Save, Loader2, GitBranch, User, Building2, Banknote, CalendarClock, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { DEAL_STAGES } from '../../constants/dealStages';

interface Props {
  isOpen: boolean;
  initialData?: any;          // tahrirlash uchun mavjud bitim
  defaultStage?: string;      // "+" tugmasidan kelgan bosqich
  lockedClientId?: string;    // mijoz kartochkasidan — kontragent qulflangan
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = (stage: string, clientId: string) => ({
  title: '',
  client_id: clientId || '',
  contact_id: '',
  expected_amount: '',
  expected_close_date: '',
  owner_id: '',
  stage: stage || 'new',
});

export default function DealModal({ isOpen, initialData, defaultStage, lockedClientId, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(emptyForm(defaultStage || 'new', lockedClientId || ''));
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        title: initialData.title || '',
        client_id: initialData.client_id || '',
        contact_id: initialData.contact_id || '',
        expected_amount: initialData.expected_amount?.toString() || '',
        expected_close_date: initialData.expected_close_date?.slice(0, 10) || '',
        owner_id: initialData.owner_id || '',
        stage: initialData.stage || 'new',
      });
    } else {
      setForm({ ...emptyForm(defaultStage || 'new', lockedClientId || ''), owner_id: profile?.id || '' });
    }
    setClientSearch('');
  }, [isOpen, initialData, defaultStage, lockedClientId, profile?.id]);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('clients').select('id, full_name, kind').order('full_name').then(({ data }) => setClients(data || []));
    supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => setStaff(data || []));
  }, [isOpen]);

  // Tanlangan kontragent kompaniya bo'lsa — kontaktlarini yuklaymiz
  const selectedClient = clients.find(c => c.id === form.client_id);
  const isCompany = selectedClient?.kind === 'company';

  useEffect(() => {
    if (!form.client_id || !isCompany) { setContacts([]); return; }
    supabase.from('contacts').select('*').eq('client_id', form.client_id).then(({ data }) => setContacts(data || []));
  }, [form.client_id, isCompany]);

  const setClient = (id: string) => {
    // Kontragent o'zgarsa contact_id tozalanadi
    setForm((f: any) => ({ ...f, client_id: id, contact_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) return toast.error(t('select_client'));
    setLoading(true);
    try {
      const payload: any = {
        title: form.title,
        client_id: form.client_id,
        contact_id: isCompany ? (form.contact_id || null) : null,
        expected_amount: Number(form.expected_amount) || 0,
        expected_close_date: form.expected_close_date || null,
        owner_id: form.owner_id || profile?.id || null,
        stage: form.stage,
      };

      let error;
      if (initialData) {
        ({ error } = await supabase.from('deals').update(payload).eq('id', initialData.id));
      } else {
        payload.created_by = profile?.id || null;
        ({ error } = await supabase.from('deals').insert([payload]));
      }
      if (error) throw error;

      toast.success(t('deal_saved'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const visibleClients = clientSearch
    ? clients.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-115 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <GitBranch size={18} className="text-primary" /> {initialData ? t('edit_deal') : t('new_deal')}
          </h3>
          <button type="button" onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Bitim nomi */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('deal_title')}</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="OOO Stroy Invest — tekstil" className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30" />
          </div>

          {/* Kontragent */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('client')}</label>
            {lockedClientId ? (
              <div className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-black flex items-center gap-2">
                {isCompany ? <Building2 size={14} className="text-primary" /> : <User size={14} className="text-primary" />}
                {selectedClient?.full_name || '—'}
              </div>
            ) : (
              <>
                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder={t('search_client_placeholder')} className="w-full px-4 py-2.5 mb-1.5 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-bold outline-none focus:border-primary/30" />
                <select required value={form.client_id} onChange={e => setClient(e.target.value)} className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 appearance-none">
                  <option value="" className="bg-[#0c0c0e]">— {t('select_client')} —</option>
                  {visibleClients.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0c0c0e]">{c.kind === 'company' ? '🏢 ' : '👤 '}{c.full_name}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Kontakt — faqat kompaniyada */}
          {isCompany && contacts.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('spoke_with')}</label>
              <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 appearance-none">
                <option value="" className="bg-[#0c0c0e]">— {t('no_contact_selected')} —</option>
                {contacts.map(ct => (
                  <option key={ct.id} value={ct.id} className="bg-[#0c0c0e]">{ct.position ? `${ct.full_name} (${ct.position})` : ct.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Banknote size={11} /> {t('expected_amount')}</label>
              <input type="number" step="any" value={form.expected_amount} onChange={e => setForm({ ...form, expected_amount: e.target.value })} placeholder="0" className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-emerald-400 text-sm font-black outline-none focus:border-primary/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1"><CalendarClock size={11} /> {t('expected_close')}</label>
              <input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30" />
            </div>
          </div>

          {/* Javobgar */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1"><UserCheck size={11} /> {t('deal_owner')}</label>
            <select value={form.owner_id} onChange={e => setForm({ ...form, owner_id: e.target.value })} className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 appearance-none">
              <option value="" className="bg-[#0c0c0e]">—</option>
              {staff.map(s => <option key={s.id} value={s.id} className="bg-[#0c0c0e]">{s.full_name}</option>)}
            </select>
          </div>

          {/* Bosqich */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('status')}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEAL_STAGES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm({ ...form, stage: s.id })}
                  className={cn(
                    "py-2 rounded-xl text-[8px] font-black uppercase tracking-wide transition-all border",
                    form.stage === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                  )}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={3} />} {t('save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
