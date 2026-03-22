import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Plus, Loader2, PieChart, X, ChevronDown, Check, DollarSign, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

const CATEGORIES = [
  { id: 'Office', name: 'Office', color: 'text-blue-400' },
  { id: 'Kommunal', name: 'Kommunal', color: 'text-amber-400' },
  { id: 'Oylik', name: 'Ish haqi', color: 'text-purple-400' },
  { id: 'Transport', name: 'Transport', color: 'text-rose-400' },
];

export default function OfficeExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'Office', amount: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('office_expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Office Expenses jadvaliga yozish
    const { error: expErr } = await supabase.from('office_expenses').insert([formData]);

    if (!expErr) {
      // 2. MOLIYA JADVALIGA YOZISH (EXPENSE)
      await supabase.from('transactions').insert([{
        type: 'expense',
        category: formData.category,
        amount: Number(formData.amount),
        description: `Xarajat: ${formData.title}`,
        created_at: new Date().toISOString()
      }]);

      // 3. Audit Log
      await supabase.from('audit_logs').insert([{
        action: 'CREATED',
        entity: 'XARAJAT',
        details: `${formData.title} xarajati qo'shildi. Summa: $${formData.amount}`,
        user_name: 'Admin'
      }]);

      setIsModalOpen(false);
      setFormData({ title: '', category: 'Office', amount: '' });
      fetchExpenses();
    }
    setLoading(false);
  };

  const selectedCat = CATEGORIES.find(c => c.id === formData.category) || CATEGORIES[0];

  return (
    <div className="space-y-8 text-left p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-white uppercase ">Office Xarajatlari</h2>
        <button onClick={() => setIsModalOpen(true)} className="px-8 py-3.5 bg-[#34d399] text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[10px] tracking-widest">+ Yangi Xarajat</button>
      </div>

      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] flex items-center gap-6">
        <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-500"><PieChart size={32} /></div>
        <div><p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Umumiy Xarajatlar:</p><p className="text-3xl font-black text-white tracking-tighter">${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}</p></div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[300px]">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[#34d399]"><tr><th className="px-8 py-6 text-[10px] font-black uppercase">Nomi</th><th className="px-8 py-6 text-[10px] font-black uppercase text-center">Kategoriya</th><th className="px-8 py-6 text-[10px] font-black uppercase text-right">Summa</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition-all">
                <td className="px-8 py-5 text-white font-bold">{e.title}</td>
                <td className="px-8 py-5 text-center"><span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] text-gray-500 font-bold uppercase">{e.category}</span></td>
                <td className="px-8 py-5 text-right font-black text-rose-500">-${Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-[400px] bg-[#0c0c0e] border border-white/10 rounded-[2rem] p-8 shadow-2xl space-y-6">
               <h3 className="text-lg font-black text-white italic">Yangi xarajat</h3>
               <div className="space-y-4">
                 <input className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white outline-none" placeholder="Xarajat nomi" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                 <div className="relative">
                   <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white flex justify-between cursor-pointer"><span className={cn("text-sm font-bold", selectedCat.color)}>{selectedCat.name}</span><ChevronDown size={16}/></div>
                   {isDropdownOpen && (
                     <div className="absolute top-full mt-2 w-full bg-[#161618] border border-white/10 rounded-xl overflow-hidden z-[210]">
                       {CATEGORIES.map(cat => <div key={cat.id} onClick={() => {setFormData({...formData, category: cat.id}); setIsDropdownOpen(false);}} className="p-4 hover:bg-white/5 text-xs font-bold text-white cursor-pointer">{cat.name}</div>)}
                     </div>
                   )}
                 </div>
                 <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" size={16}/><input type="number" className="w-full pl-10 pr-5 py-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-500 outline-none font-bold" placeholder="Summa" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
               </div>
               <button onClick={handleSave} className="w-full py-4 bg-primary text-black font-black rounded-xl shadow-lg uppercase text-[10px]">Saqlash</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}