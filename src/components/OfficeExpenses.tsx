import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, Plus, FileDown, Trash2, Loader2, DollarSign, PieChart } from 'lucide-react';
import { generatePDF } from '../utils/exportPDF';

export default function OfficeExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'Office', amount: '', description: '' });

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('office_expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('office_expenses').insert([formData]);
    setIsModalOpen(false);
    setFormData({ title: '', category: 'Office', amount: '', description: '' });
    fetchExpenses();
  };

  // PDF Eksport Funksiyasi
  const exportToPDF = () => {
    const headers = [["Nomi", "Kategoriya", "Summa", "Sana"]];
    const dataRows = expenses.map(e => [
      e.title, 
      e.category, 
      `$${e.amount}`, 
      new Date(e.created_at).toLocaleDateString()
    ]);
    generatePDF("Office Xarajatlari Hisoboti", headers, dataRows);
  };

  return (
    <div className="space-y-8 text-left text-app-fg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic decoration-primary/30 underline">Office Xarajatlari</h2>
          <p className="text-sm text-app-muted italic">Ma'muriy va operatsion xarajatlar nazorati</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToPDF} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all font-bold text-xs uppercase">
            <FileDown size={18} /> PDF Eksport
          </button>
          <button onClick={() => setIsModalOpen(true)} className="px-8 py-3 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-xs">
            + Yangi Xarajat
          </button>
        </div>
      </div>

      {/* Jami Xarajat Vidjeti */}
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] backdrop-blur-md flex items-center gap-6">
        <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-500"><PieChart size={32} /></div>
        <div>
          <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Umumiy Xarajatlar (Ma'muriy):</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            ${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-100px">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-primary">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Xarajat Nomi</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Kategoriya</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Sana</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map((e) => (
              <tr key={e.id} className="group hover:bg-rose-500/1.0 transition-all">
                <td className="px-8 py-5">
                   <p className="text-sm font-bold text-white">{e.title}</p>
                   <p className="text-[10px] text-app-muted">{e.description || 'Izoh yo\'q'}</p>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold uppercase text-app-muted">{e.category}</span>
                </td>
                <td className="px-8 py-5 text-center text-xs text-app-muted">{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="px-8 py-5 text-right font-black text-rose-400">-${Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleSave} className="relative w-full max-w-112.5px bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-white italic">Yangi xarajat qo'shish</h3>
            <input required placeholder="Xarajat nomi" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30" onChange={e => setFormData({...formData, title: e.target.value})} />
            <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none" onChange={e => setFormData({...formData, category: e.target.value})}>
               <option value="Office">Office</option>
               <option value="Kommunal">Kommunal</option>
               <option value="Oylik">Ish haqi</option>
               <option value="Transport">Transport</option>
            </select>
            <input required type="number" placeholder="Summa ($)" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none" onChange={e => setFormData({...formData, amount: e.target.value})} />
            <button type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg">Saqlash</button>
          </form>
        </div>
      )}
    </div>
  );
}