import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next'; // QO'SHILDI

export default function AddClientModal({ isOpen, onClose, onSuccess, initialData }: any) {
  const { t } = useTranslation(); // QO'SHILDI
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '+998 ',
    client_type: 'Chakana'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ full_name: '', phone: '+998 ', client_type: 'Chakana' });
    }
  }, [initialData, isOpen]);

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
      const { error } = initialData
        ? await supabase.from('clients').update(formData).eq('id', initialData.id)
        : await supabase.from('clients').insert([formData]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  // Toifalar ro'yxati va ularning tarjimalari
  const clientTypes = [
    { id: 'Chakana', name: t('retail') },
    { id: 'VIP', name: t('vip') },
    { id: 'Ulgurji', name: t('wholesale') }
  ];

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-112.5 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-8"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">
            {initialData ? t('edit_client') : t('new_client')}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t('client_full_name')}</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input required className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 transition-all uppercase text-xs" placeholder="Azizbek Karimov" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
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

          <button disabled={loading} type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} strokeWidth={3} />} {t('save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}