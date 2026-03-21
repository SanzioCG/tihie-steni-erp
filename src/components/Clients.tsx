import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, Plus, User, Phone, Loader2, Edit2, Trash2, FileDown } from 'lucide-react';
import AddClientModal from './AddClientModal';
import { generatePDF } from '../utils/exportPDF';
import { cn } from '../utils';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const exportPDF = () => {
    const headers = [["MIJOZ", "TELEFON", "TURI", "BALANS"]];
    const dataRows = clients.map(c => [c.full_name, c.phone || '-', c.client_type, `$${c.balance}`]);
    generatePDF("Mijozlar Bazasi Hisoboti", headers, dataRows);
  };

  const filtered = clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 text-left text-app-fg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase decoration-primary/30">Mijozlar Bazasi</h2>
          <p className="text-sm text-app-muted italic">CRM boshqaruvi va kontragentlar</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="px-6 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">
            <FileDown size={18} className="text-primary" /> PDF Eksport
          </button>
          <button onClick={() => { setSelectedClient(null); setIsModalOpen(true); }} className="px-8 py-4 bg-primary text-black font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest text-[11px] flex items-center gap-2">
            <Plus size={20} /> Yangi Mijoz
          </button>
        </div>
      </div>

      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-xl min-h-112.5px relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-primary">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Mijoz</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Telefon</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Balans</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c) => (
                <tr key={c.id} className="group hover:bg-primary/1.0 transition-all">
                  <td className="px-8 py-5 font-bold text-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-app-fg/5 flex items-center justify-center text-primary font-black text-lg">{c.full_name.charAt(0)}</div>
                    <div>{c.full_name}<p className="text-[10px] text-app-muted uppercase">{c.client_type}</p></div>
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-app-muted">{c.phone || '--'}</td>
                  <td className="px-8 py-5 text-center font-black text-sm tracking-tighter">
                    <span className={cn(Number(c.balance) < 0 ? "text-rose-500" : "text-emerald-500")}>${Number(c.balance).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => { setSelectedClient(c); setIsModalOpen(true); }} className="p-2.5 text-app-muted hover:text-primary bg-white/5 rounded-xl transition-all"><Edit2 size={16}/></button>
                       <button onClick={() => { if(confirm('O\'chirish?')) supabase.from('clients').delete().eq('id', c.id).then(fetchClients) }} className="p-2.5 text-app-muted hover:text-rose-500 bg-white/5 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchClients} initialData={selectedClient} />
    </div>
  );
}