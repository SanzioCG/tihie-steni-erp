import { useState } from 'react';
import { 
  ShieldCheck, Clock, Search, 
  Loader2, ChevronDown, DownloadCloud,
  ShoppingCart, Package, ArrowDownCircle, Users, Wallet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '../hooks/queries/useQueries';

const ENTITY_CONFIG: any = {
  SOTUV: { color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5', icon: ShoppingCart },
  KIRIM: { color: 'text-blue-500 border-blue-500/20 bg-blue-500/5', icon: ArrowDownCircle },
  MAHSULOT: { color: 'text-amber-500 border-amber-500/20 bg-amber-500/5', icon: Package },
  MIJOZ: { color: 'text-purple-500 border-purple-500/20 bg-purple-500/5', icon: Users },
  XARAJAT: { color: 'text-rose-500 border-rose-500/20 bg-rose-500/5', icon: Wallet },
};

export default function Audit() {
  const { t, i18n } = useTranslation();
  
  const { 
    data, 
    isLoading: loading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useAuditLogs();

  // Barcha sahifalardagi log'larni bitta arrayga to'plash
  const logs = data?.pages.flatMap(page => page.logs) || [];

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterTypes = [
    { id: 'ALL', name: t('all') },
    { id: 'SOTUV', name: t('sales') },
    { id: 'KIRIM', name: t('inbound_stock') },
    { id: 'MAHSULOT', name: t('catalog') },
    { id: 'MIJOZ', name: t('clients') },
    { id: 'XARAJAT', name: t('expenses') },
  ];

  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = !search || 
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || log.entity === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5 text-left text-app-fg animate-in fade-in duration-500 pb-20">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-primary" size={22} strokeWidth={2.5} /> {t('audit')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-0.5 ml-8">
            {t('audit_subtitle') || "System Security & Action Logs"}
          </p>
        </div>

        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
          <DownloadCloud size={16} /> Export CSV
        </button>
      </div>

      <div className="space-y-5 mx-2">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder={t('search') + " (Xodim, mahsulot yoki harakat)..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-16 pr-6 py-3.5 bg-[#0c0c0e] border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30 transition-all font-bold text-sm uppercase shadow-2xl"
          />
        </div>

        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
          {filterTypes.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border-2",
                activeFilter === f.id 
                  ? "bg-primary text-black border-primary shadow-lg shadow-primary/20 scale-105" 
                  : "bg-white/5 text-gray-500 border-white/5 hover:border-white/10"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden min-h-125 relative mx-2 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 w-52">{t('time')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center w-40">{t('type')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('details')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">{t('admin')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log: any) => {
                const Config = ENTITY_CONFIG[log.entity] || { color: 'text-gray-500 border-gray-500/20 bg-gray-500/5', icon: Clock };
                const Icon = Config.icon;

                return (
                  <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-2.5">
                       <div className="flex flex-col">
                          <span className="text-white font-black text-xs">
                             {new Date(log.created_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-gray-600 uppercase mt-1">
                             {new Date(log.created_at).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-tighter",
                        Config.color
                      )}>
                        <Icon size={12} />
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-8 py-2.5">
                        <p className="text-sm font-black text-gray-200 uppercase tracking-tight leading-relaxed">
                            {log.details}
                        </p>
                    </td>
                    <td className="px-8 py-2.5 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="font-black text-[10px] text-white uppercase tracking-widest">{log.user_name}</span>
                        </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                          <Search size={48} />
                          <p className="font-black uppercase text-xs tracking-[0.3em]">{t('no_data')}</p>
                      </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasNextPage && (
          <div className="p-10 text-center border-t border-white/5 bg-white/[0.01]">
            <button 
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-12 py-4 bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
            >
              {isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} strokeWidth={3} />}
              {t('load_more') || "Yana yuklash"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}