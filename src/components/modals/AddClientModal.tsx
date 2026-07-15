import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Phone, MapPin, Compass, UserCheck, FileText, Building2, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useTranslation } from 'react-i18next'; // QO'SHILDI
import { cn } from '../../lib/utils';

const EMPTY_FORM = {
  kind: 'person',
  full_name: '',
  phone: '+998 ',
  client_type: 'retail',
  source: '',
  address: '',
  responsible_id: '',
  notes: '',
  // Rekvizitlar — faqat kind='company' uchun yuboriladi
  inn: '',
  bank_name: '',
  bank_account: '',
  mfo: '',
  legal_address: '',
  director_name: '',
  email: '',
};

export default function AddClientModal({ isOpen, onClose, onSuccess, initialData }: any) {
  const { t } = useTranslation(); // QO'SHILDI
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>(EMPTY_FORM);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...EMPTY_FORM, ...initialData, responsible_id: initialData.responsible_id ?? '' });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('profiles').select('id, full_name, role').order('full_name')
      .then(({ data }) => setStaff(data || []));
  }, [isOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); 
    if (!input.startsWith('998')) input = '998' + input;
    if (input.length > 12) input = input.slice(0, 12);

    let formatted = '+' + input.substring(0, 3);
    if (input.length > 3) formatted += ' (' + input.substring(3, 5);
    if (input.length > 5) formatted += ') ' + input.substring(5, 8);
    if (input.length > 8) formatted += '-' + input.substring(8, 10);
    if (input.length > 10) formatted += '-' + input.substring(10, 12);

    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length < 19) return alert(t('phone_full_error'));
    
    setLoading(true);
    try {
      const isCompany = formData.kind === 'company';

      // Bo'sh responsible_id ni null ga aylantiramiz (UUID ustuni)
      const payload = {
        kind: formData.kind,
        full_name: formData.full_name,
        phone: formData.phone,
        client_type: formData.client_type,
        source: formData.source || null,
        address: formData.address || null,
        responsible_id: formData.responsible_id || null,
        notes: formData.notes || null,
        // Jismoniy shaxsda rekvizitlar tozalanadi — kompaniyadan odamga
        // o'zgartirilganda eski qiymatlar qolib ketmasin
        inn: isCompany ? formData.inn || null : null,
        bank_name: isCompany ? formData.bank_name || null : null,
        bank_account: isCompany ? formData.bank_account || null : null,
        mfo: isCompany ? formData.mfo || null : null,
        legal_address: isCompany ? formData.legal_address || null : null,
        director_name: isCompany ? formData.director_name || null : null,
        email: isCompany ? formData.email || null : null,
      };

      const { error } = initialData
        ? await supabase.from('clients').update(payload).eq('id', initialData.id)
        : await supabase.from('clients').insert([payload]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  // Toifalar ro'yxati — id kanonik (bazadagi CHECK), name tarjima
  const clientTypes = [
    { id: 'retail', name: t('retail') },
    { id: 'vip', name: t('vip') },
    { id: 'wholesale', name: t('wholesale') }
  ];

  const isCompany = formData.kind === 'company';

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-112.5 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-8 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">
            {initialData ? t('edit_client') : t('new_client')}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('counterparty_kind')}</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
              {([
                { id: 'person', name: t('kind_person'), icon: User },
                { id: 'company', name: t('kind_company'), icon: Building2 },
              ] as const).map((k) => {
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, kind: k.id })}
                    className={cn(
                      "py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                      formData.kind === k.id ? "bg-primary text-black" : "text-gray-500 hover:text-white"
                    )}
                  >
                    <Icon size={13} /> {k.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">
              {isCompany ? t('company_name') : t('client_full_name')}
            </label>
            <div className="relative">
              {isCompany
                ? <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                : <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />}
              <input required className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 transition-all uppercase text-xs" placeholder={isCompany ? 'OOO "Stroy Invest"' : 'Azizbek Karimov'} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('phone_number')}</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input required type="text" className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-mono font-black text-lg outline-none focus:border-primary/30 transition-all" value={formData.phone} onChange={handlePhoneChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('client_category')}</label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
              {clientTypes.map((type) => (
                <button 
                  key={type.id} 
                  type="button" 
                  onClick={() => setFormData({...formData, client_type: type.id})} 
                  className={`py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${formData.client_type === type.id ? "bg-primary text-black" : "text-gray-500 hover:text-white"}`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('client_source')}</label>
              <div className="relative">
                <Compass className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 transition-all text-xs" placeholder={t('source_placeholder')} value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('responsible_person')}</label>
              <div className="relative">
                <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 z-10" size={16} />
                <select className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 transition-all text-xs appearance-none" value={formData.responsible_id || ''} onChange={e => setFormData({...formData, responsible_id: e.target.value})}>
                  <option value="" className="bg-[#0c0c0e]">{t('no_responsible')}</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0c0c0e]">{s.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('client_address')}</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 transition-all text-xs" placeholder={t('address_placeholder')} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          {isCompany && (
            <div className="space-y-4 p-5 bg-white/3 border border-white/5 rounded-3xl">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <Landmark size={14} strokeWidth={3} /> {t('requisites')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReqField label={t('inn')} value={formData.inn} onChange={(v: string) => setFormData({ ...formData, inn: v })} placeholder="300123456" />
                <ReqField label={t('mfo')} value={formData.mfo} onChange={(v: string) => setFormData({ ...formData, mfo: v })} placeholder="00450" />
              </div>
              <ReqField label={t('bank_name')} value={formData.bank_name} onChange={(v: string) => setFormData({ ...formData, bank_name: v })} />
              <ReqField label={t('bank_account')} value={formData.bank_account} onChange={(v: string) => setFormData({ ...formData, bank_account: v })} placeholder="2020 8000 0000 0000 0000" />
              <ReqField label={t('legal_address')} value={formData.legal_address} onChange={(v: string) => setFormData({ ...formData, legal_address: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReqField label={t('director_name')} value={formData.director_name} onChange={(v: string) => setFormData({ ...formData, director_name: v })} />
                <ReqField label={t('email')} type="email" value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} placeholder="info@company.uz" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('client_notes')}</label>
            <div className="relative">
              <FileText className="absolute left-5 top-4 text-gray-600" size={16} />
              <textarea rows={2} className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 transition-all text-xs resize-none" placeholder={t('notes_placeholder')} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} strokeWidth={3} />} {t('save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function ReqField({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-primary/30 transition-all"
      />
    </div>
  );
}