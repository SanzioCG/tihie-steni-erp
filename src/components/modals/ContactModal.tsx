import { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Briefcase, Phone, Mail, Send, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const EMPTY_CONTACT = {
  full_name: '',
  position: '',
  phone: '',
  email: '',
  telegram: '',
  is_primary: false,
};

interface Props {
  isOpen: boolean;
  clientId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContactModal({ isOpen, clientId, initialData, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_CONTACT);

  useEffect(() => {
    setForm(initialData ? { ...EMPTY_CONTACT, ...initialData } : EMPTY_CONTACT);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // is_primary uchun unique index bor: yangisini asosiy qilishdan oldin
      // shu kontragentdagi eskisini false qilamiz, aks holda unique violation.
      if (form.is_primary) {
        const unset = supabase.from('contacts').update({ is_primary: false }).eq('client_id', clientId);
        const { error: unsetError } = initialData
          ? await unset.neq('id', initialData.id)
          : await unset;
        if (unsetError) throw unsetError;
      }

      const payload = {
        client_id: clientId,
        full_name: form.full_name,
        position: form.position || null,
        phone: form.phone || null,
        email: form.email || null,
        telegram: form.telegram || null,
        is_primary: form.is_primary,
      };

      const { error } = initialData
        ? await supabase.from('contacts').update(payload).eq('id', initialData.id)
        : await supabase.from('contacts').insert([payload]);
      if (error) throw error;

      toast.success(t('contact_saved'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-105 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter">
            {initialData ? t('edit_contact') : t('add_contact')}
          </h3>
          <button type="button" onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Field icon={User} label={t('contact_name')} required value={form.full_name} onChange={(v: string) => setForm({ ...form, full_name: v })} placeholder="Alisher Rahimov" />
          <Field icon={Briefcase} label={t('contact_position')} value={form.position} onChange={(v: string) => setForm({ ...form, position: v })} placeholder="Snabjenets" />
          <Field icon={Phone} label={t('phone_number')} value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} placeholder="+998 (90) 123-45-67" />
          <Field icon={Mail} label={t('email')} type="email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="alisher@company.uz" />
          <Field icon={Send} label={t('contact_telegram')} value={form.telegram} onChange={(v: string) => setForm({ ...form, telegram: v })} placeholder="@alisher" />

          <button
            type="button"
            onClick={() => setForm({ ...form, is_primary: !form.is_primary })}
            className={cn(
              "w-full py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
              form.is_primary
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
            )}
          >
            <Star size={14} strokeWidth={3} fill={form.is_primary ? 'currentColor' : 'none'} /> {t('primary_contact')}
          </button>

          <button disabled={loading} type="submit" className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={3} />} {t('save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = 'text', required = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
        <input
          type={type}
          required={required}
          value={value || ''}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 transition-all"
        />
      </div>
    </div>
  );
}
