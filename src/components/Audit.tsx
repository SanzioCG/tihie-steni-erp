import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShieldCheck, Clock, User, Activity, 
  Search, Filter, Database, AlertCircle,
  ArrowRightCircle, Loader2
} from 'lucide-react';
import { cn } from '../utils';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'UPDATED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'DELETED': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const filteredLogs = logs.filter(l => 
    l.details.toLowerCase().includes(search.toLowerCase()) || 
    l.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 text-left text-app-fg">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic underline decoration-primary/30 flex items-center gap-3">
            <ShieldCheck className="text-primary" size={32} /> Audit va Nazorat
          </h2>
          <p className="text-sm text-app-muted italic">Tizimdagi barcha operatsiyalar jurnali</p>
        </div>
        
        <div className="flex gap-2 bg-app-card p-1.5 rounded-2xl border border-app-border">
           <div className="px-4 py-2 bg-primary/10 rounded-xl text-primary text-[10px] font-black uppercase">Live Monitoring</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-primary" size={18} />
        <input 
          type="text" placeholder="Harakat yoki obyekt bo'yicha qidirish..." 
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-4 py-5 bg-app-card border border-app-border rounded-[2rem] text-app-fg outline-none focus:border-primary/40 transition-all font-medium shadow-xl"
        />
      </div>

      {/* LOGS LIST */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl min-h-[500px] relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-primary border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Vaqt</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Mas'ul</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Harakat</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Tafsilotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.01] transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-app-muted font-mono text-[11px]">
                        <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-app-fg/5 flex items-center justify-center text-primary font-bold text-[10px]">
                           {log.user_name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase border",
                        getActionStyle(log.action)
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-app-fg/5 rounded-lg text-app-muted"><Database size={14} /></div>
                          <div>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{log.entity}</p>
                            <p className="text-sm font-medium text-app-fg">{log.details}</p>
                          </div>
                       </div>
                    </td>
                  </tr>
                )) : !loading && (
                  <tr>
                    <td colSpan={4} className="py-32 text-center text-app-muted italic">
                       Hozircha hech qanday harakat qayd etilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}