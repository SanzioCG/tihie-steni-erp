import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, UserPlus, Loader2, Save, Phone, 
  Building2, MapPin, Percent, Send, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddClientModal({ isOpen, onClose, onSuccess, initialData }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    telegram: '',
    address: '',
    inn: '',
    credit_limit: '0',
    discount_percent: '0',
    client_type: 'Chakana (Retail)'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        phone: initialData.phone || '',
        company_name: initialData.company_name || '',
        telegram: initialData.telegram || '',
        address: initialData.address || '',
        inn: initialData.inn || '',
        credit_limit: initialData.credit_limit?.toString() || '0',
        discount_percent: initialData.discount_percent?.toString() || '0',
        client_type: initialData.client_type || 'Chakana (Retail)'
      });
    } else {
      setFormData({ 
        full_name: '', phone: '', company_name: '', telegram: '', 
        address: '', inn: '', credit_limit: '0', discount_percent: '0', 
        client_type: 'Chakana (Retail)' 
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        credit_limit: Number(formData.credit_limit),
        discount_percent: Number(formData.discount_percent)
      };

      const { error } = initialData 
        ? await supabase.from('clients').update(dataToSave).eq('id', initialData.id)
        : await supabase.from('clients').insert([dataToSave]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[650px] bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl p-8 md:p-10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <UserPlus size={22} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight italic">
              {initialData ? 'Mijozni tahrirlash' : 'Yangi Mijoz Qo\'shish'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* FIO & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">F.I.O</label>
              <input 
                required 
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30 transition-all" 
                placeholder="Masalan: Aliyev Vali" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mijoz Turi</label>
              <select 
                value={formData.client_type} 
                onChange={e => setFormData({...formData, client_type: e.target.value})} 
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none appearance-none cursor-pointer"
              >
                <option value="Chakana (Retail)" className="bg-[#0c0c0e]">Chakana (Retail)</option>
                <option value="Ulgurji (Wholesale)" className="bg-[#0c0c0e]">Ulgurji (Wholesale)</option>
                <option value="VIP" className="bg-[#0c0c0e]">VIP Hamkor</option>
              </select>
            </div>
          </div>

          {/* Phone, Telegram, Company */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Telefon</label>
              <div className="relative">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full pl-10 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none text-sm" 
                  placeholder="+998" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Telegram</label>
              <div className="relative">
                <Send size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input 
                  value={formData.telegram} 
                  onChange={e => setFormData({...formData, telegram: e.target.value})} 
                  className="w-full pl-10 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none text-sm" 
                  placeholder="@username" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Kompaniya</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input 
                  value={formData.company_name} 
                  onChange={e => setFormData({...formData, company_name: e.target.value})} 
                  className="w-full pl-10 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none text-sm" 
                  placeholder="MCHJ nomi" 
                />
              </div>
            </div>
          </div>

          {/* INN & Credit Limit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">STIR (INN)</label>
              <input 
                value={formData.inn} 
                onChange={e => setFormData({...formData, inn: e.target.value})} 
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none font-mono" 
                placeholder="123456789" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Qarz Limiti ($)</label>
              <input 
                type="number" 
                value={formData.credit_limit} 
                onChange={e => setFormData({...formData, credit_limit: e.target.value})} 
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none font-mono" 
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">Manzil</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
              <input 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="w-full pl-10 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white outline-none text-sm" 
                placeholder="Viloyat, tuman, ko'cha..." 
              />
            </div>
          </div>

          {/* Footer Section */}
          <div className="pt-8 border-t border-white/5 flex items-center justify-between">
            {/* Chegirma Input - Referensdagi yashil blok */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
              <Percent size={14} className="text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Chegirma:</span>
              <input 
                type="number" 
                value={formData.discount_percent} 
                onChange={e => setFormData({...formData, discount_percent: e.target.value})} 
                className="bg-transparent w-8 text-white font-bold outline-none text-center" 
              />
              <span className="text-primary font-bold">%</span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-all"
              >
                Bekor
              </button>
              <button 
                disabled={loading} 
                type="submit" 
                className="flex items-center gap-3 px-10 py-4 bg-primary text-black font-black rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest text-[11px]"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Saqlash
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}