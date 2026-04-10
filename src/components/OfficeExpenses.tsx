import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Plus, Loader2, PieChart, X, ChevronDown, DollarSign, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore'; // QO'SHILDI
import { cn } from '../utils';

export default function OfficeExpenses() {
  const { t } = useTranslation();
  const { profile } = useAuthStore(); // Profilni olamiz
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'Office', amount: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = [
    { id: 'Office', name: t('cat_office'), color: 'text-blue-400' },
    { id: 'Kommunal', name: t('cat_communal'), color: 'text-amber-400' },
    { id: 'Oylik', name: t('cat_salary'), color: 'text-purple-400' },
    { id: 'Transport', name: t('cat_transport'), color: 'text-rose-400' },
  ];

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('office_expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    setLoading(true);
    
    try {
      // 🟢 RPC orqali xavfsiz bitta tranzaksiya
      const { error } = await supabase.rpc('process_office_expense', {
        p_title: formData.title,
        p_category: formData.category,
        p_amount: Number(formData.amount),
        p_user_name: profile?.full_name || 'Admin'
      });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ title: '', category: 'Office', amount: '' });
      fetchExpenses();
    } catch (err: any) {
      alert("Xatolik yuz berdi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find(c => c.id === formData.category) || CATEGORIES[0];

  return (
    <div className="space-y-8 text-left p-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
          {t('office_expenses_title')}
        </h2>
        <button onClick={() => setIsModalOpen(true)} className="px-8 py-3.5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[10px] tracking-widest">
          + {t('new_expense')}
        </button>
      </div>

      {/* JAMI XARAJAT VIDJETI */}
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] flex items-center gap-6 mx-2 backdrop-blur-sm shadow-xl">
        <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-500 shadow-inner"><PieChart size={32} /></div>
        <div>
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('total_expenses_label')}:</p>
          <p className="text-4xl font-black text-white tracking-tighter">
            ${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* JADVAL */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-75 mx-2">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-primary border-b border-white/5">
              <tr>
                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest">{t('name')}</th>
                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-center">{t('category')}</th>
                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-right">{t('total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.map((e) => (
                <tr key={e.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-10 py-6 text-white font-black uppercase text-sm">{e.title}</td>
                  <td className="px-10 py-6 text-center">
                    <span className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[9px] text-gray-500 font-black uppercase tracking-widest">
                      {CATEGORIES.find(c => c.id === e.category)?.name || e.category}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right font-black text-rose-500 text-lg italic tracking-tighter">
                    -${Number(e.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="py-24 text-center text-gray-700 font-black uppercase text-[10px] tracking-[0.4em] opacity-40">{t('no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-8">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                     {t('new_expense')}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-white transition-colors"><X size={24}/></button>
               </div>

               <div className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{t('expense_name')}</label>
                    <input autoFocus className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold uppercase text-sm focus:border-primary/20 transition-all" placeholder="Masalan: Arenda" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{t('category')}</label>
                    <div className="relative">
                      <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white flex justify-between items-center cursor-pointer hover:bg-white/10 transition-all">
                          <span className={cn("text-sm font-black uppercase tracking-widest", selectedCat.color)}>{selectedCat.name}</span>
                          <ChevronDown size={18} className="text-gray-500"/>
                      </div>
                      {isDropdownOpen && (
                        <div className="absolute top-full mt-2 w-full bg-[#121214] border border-white/10 rounded-2xl overflow-hidden z-[210] shadow-2xl">
                          {CATEGORIES.map(cat => (
                            <div key={cat.id} onClick={() => {setFormData({...formData, category: cat.id}); setIsDropdownOpen(false);}} className="p-5 hover:bg-primary/10 text-xs font-black text-white cursor-pointer border-b border-white/5 last:border-0 uppercase tracking-widest transition-colors">
                              {cat.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{t('total')} ($)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-500" size={20} strokeWidth={3}/>
                        <input type="number" className="w-full pl-12 pr-6 py-5 bg-rose-500/5 border border-rose-500/10 rounded-3xl text-rose-500 outline-none font-black text-2xl transition-all focus:border-rose-500/30 text-center" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    </div>
                 </div>
               </div>

               <button onClick={handleSave} disabled={loading} className="w-full py-6 bg-primary text-black font-black rounded-[1.5rem] shadow-lg shadow-primary/10 uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                 {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} strokeWidth={3}/>} {t('save')}
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}