import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldCheck, Clock, Database, Loader2, Search, Filter } from 'lucide-react';
import { cn } from '../utils';
import { useTranslation } from 'react-i18next';

export default function Audit() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // Filtr holati

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  // FILTRLAR RO'YXATI
  const filterTypes = [
    { id: 'ALL', name: 'Hammasi' },
    { id: 'SOTUV', name: 'Sotuvlar' },
    { id: 'ZAXIRA', name: 'Kirim/Zaxira' },
    { id: 'MAHSULOT', name: 'Katalog' },
    { id: 'XARAJAT', name: 'Xarajatlar' },
  ];

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.details?.toLowerCase().includes(search.toLowerCase()) || l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || l.entity === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 text-left text-app-fg animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary" size={32} /> Audit Jurnali
          </h2>
          <p className="text-sm text-app-muted italic">Tizimdagi barcha operatsiyalar nazorati</p>
        </div>
      </div>

      {/* SEARCH VA FILTRLAR */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
          <input 
            type="text" placeholder="Qidirish..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-app-card border border-app-border rounded-3xl text-app-fg outline-none focus:border-primary/40"
          />
        </div>

        {/* DINAMIK FILTR TUGMALARI */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {filterTypes.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                activeFilter === f.id 
                  ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
                  : "bg-white/5 text-gray-500 border-white/5 hover:border-white/10"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* JADVAL */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden min-h-125 relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <table className="w-full text-left">
          <thead className="bg-white/5 text-primary">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Vaqt</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Tur</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Tafsilot</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="group hover:bg-white/1">
                <td className="px-8 py-5 text-app-muted font-mono text-[11px]">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase border",
                    log.entity === 'SOTUV' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                    log.entity === 'ZAXIRA' ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                    log.entity === 'MAHSULOT' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                    "text-rose-500 border-rose-500/20 bg-rose-500/5"
                  )}>
                    {log.entity}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-medium text-app-fg">{log.details}</td>
                <td className="px-8 py-5 text-right font-bold text-xs text-gray-500">{log.user_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredLogs.length === 0 && (
          <div className="py-20 text-center text-gray-600 italic">Ma'lumot topilmadi</div>
        )}
      </div>
    </div>
  );
}