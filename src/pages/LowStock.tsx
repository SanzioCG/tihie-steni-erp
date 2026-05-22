import { useState } from 'react';
import { 
  Search, Loader2, Package, AlertTriangle, 
  FileDown, CheckCircle2, Plus 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, exportToPDF } from '../lib/utils'; 
import InboundModal from '../components/modals/InboundModal';
import { useLowStock } from '../hooks/queries/useQueries';

export default function LowStock() {
  const { t } = useTranslation();
  const { data: stocks = [], isLoading: loading, refetch: fetchLowStock } = useLowStock();
  
  const [search, setSearch] = useState('');
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  const handleExport = () => {
    const headers = [["MAHSULOT", "PARTIYA", "QOLDIQ", "LIMIT"]];
    const rows = stocks.map((s: any) => [
      s.products?.name_uz,
      s.batch_number,
      s.remaining_quantity.toString(),
      s.min_limit.toString()
    ]);
    exportToPDF("Kam_qolgan_mahsulotlar", headers, rows);
  };

  const filteredData = stocks.filter((s: any) => 
    (s.products?.name_uz || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.batch_number || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left p-2 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-rose-500 uppercase tracking-tighter flex items-center gap-3">
            <AlertTriangle size={32} className="animate-bounce" /> {t('low_stock')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] opacity-60">
            {t('low_stock_subtitle') || "Zaxira nazorati"}
          </p>
        </div>

        <button 
          onClick={handleExport}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <FileDown size={18} /> {t('pdf_export')}
        </button>
      </div>

      <div className="relative mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
        <input 
          type="text" 
          placeholder={t('search')} 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-rose-500/20 rounded-3xl text-white outline-none focus:border-rose-500/40 shadow-xl uppercase font-black" 
        />
      </div>

      <div className="bg-[#0c0c0e] border border-rose-500/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[300px] mx-2">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Loader2 className="animate-spin text-rose-500" size={40} />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-rose-500/5 text-rose-500 border-b border-rose-500/10 uppercase">
              <tr>
                <th className="px-6 py-6 text-[9px] font-black text-center w-16">#</th>
                <th className="px-6 py-6 text-[9px] font-black">{t('image')}</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">{t('batch')}</th>
                <th className="px-6 py-6 text-[9px] font-black">{t('name')}</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">{t('qoldiq')}</th>
                <th className="px-6 py-6 text-[9px] font-black text-right">{t('limit')}</th>
                <th className="px-6 py-6 text-[9px] font-black text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filteredData.map((batch: any, index: number) => (
                  <tr key={batch.id} className="group hover:bg-rose-500/2 transition-all">
                    <td className="px-6 py-5 text-gray-700 font-black text-xs text-center">{index + 1}</td>
                    <td className="px-6 py-5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                        {batch.products?.image_url ? (
                          <img loading="lazy" decoding="async" src={batch.products.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Package className="w-full h-full p-3 text-gray-800" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-mono text-xs text-gray-500">{batch.batch_number}</td>
                    <td className="px-6 py-5 text-sm font-bold uppercase text-white">{batch.products?.name_uz}</td>
                    <td className="px-6 py-5 text-center">
                      <div className={cn(
                        "inline-flex px-4 py-2 rounded-xl font-black text-sm border transition-all",
                        Number(batch.remaining_quantity) === 0 
                          ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {batch.remaining_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-gray-600">{batch.min_limit}</td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => { setEditingBatch(batch); setIsInboundOpen(true); }} 
                        className="p-3 bg-rose-500 text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                      >
                        <Plus size={18} strokeWidth={3}/>
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredData.length === 0 && (
          <div className="py-32 flex flex-col items-center gap-4 text-gray-700">
            <CheckCircle2 size={48} />
            <p className="font-black uppercase text-xs tracking-widest">{t('no_low_stock')}</p>
          </div>
        )}
      </div>

      <InboundModal 
        isOpen={isInboundOpen} 
        onClose={() => { setIsInboundOpen(false); setEditingBatch(null); }} 
        onSuccess={fetchLowStock} 
        editData={editingBatch} 
      />
    </div>
  );
}