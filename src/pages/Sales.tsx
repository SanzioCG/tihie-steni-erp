import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Search, FileDown, Calendar, User, 
  CheckCircle2, AlertCircle, Filter, 
  ChevronDown, Package, Plus, Loader2,
  RotateCcw, Ruler, Hash, ShoppingBag
} from 'lucide-react';
import { cn, exportToPDF } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';

// MODALLARNI IMPORT QILAMIZ
import POSModal from '../components/modals/POSModal'; 
import ReturnModal from '../components/modals/ReturnModal';

export default function Sales() {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isPOSOpen, setIsPOSOpen] = useState(false); 
  const [isReturnOpen, setIsReturnOpen] = useState(false); 
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [typeFilter, setTypeFilter] = useState('ALL'); 

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (full_name, client_type, phone),
          products (id, name_uz, sku, categories (name_uz))
        `)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const handleExportPDF = () => {
    if (filteredSales.length === 0) return;
    // PDF Headerlari tarjima qilindi
    const headers = [[t('date').toUpperCase(), t('client').toUpperCase(), t('products').toUpperCase(), t('qoldiq').toUpperCase(), t('total').toUpperCase(), t('status').toUpperCase()]];
    const dataRows = filteredSales.map(s => [
      new Date(s.created_at).toLocaleDateString(i18n.language),
      s.clients?.full_name || t('general'),
      s.products?.name_uz || t('products'),
      `${s.quantity} ${s.products?.categories?.name_uz?.toLowerCase().includes('tekstil') ? 'm²' : 'm'}`,
      convert(s.total_amount),
      s.status === 'completed' ? t('completed') : t('debt')
    ]);
    exportToPDF("Sotuvlar_Hisoboti", headers, dataRows);
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      sale.products?.name_uz?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || sale.clients?.client_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500 font-sans pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
             <ShoppingBag className="text-primary" size={32} /> {t('sales_history')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">{t('sales_subtitle')}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsPOSOpen(true)} 
            className="flex-1 md:flex-none px-10 py-4 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
          >
             <Plus size={20} strokeWidth={4} /> {t('new_sale_pos')}
          </button>
          
          <button onClick={handleExportPDF} className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all font-bold text-[10px] uppercase">
             <FileDown size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mx-2">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" placeholder={t('search_sales')} 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none focus:border-primary/40 transition-all shadow-xl font-black text-sm uppercase"
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer">
          <option value="ALL">{t('all_statuses')}</option>
          <option value="completed">{t('completed')}</option>
          <option value="pending">{t('pending')}</option>
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full h-full px-6 py-4 bg-[#0c0c0e] border border-white/5 rounded-3xl text-white outline-none font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer">
          <option value="ALL">{t('client_types')}</option>
          <option value="Chakana">{t('retail')}</option>
          <option value="VIP">{t('vip')}</option>
          <option value="Ulgurji">{t('wholesale')}</option>
        </select>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-125 mx-2">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead className="bg-white/5 text-primary">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">{t('date')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">{t('client_and_type')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">{t('sold_product')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">{t('status')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">{t('total')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filteredSales.map((sale) => {
                const isTek = sale.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
                return (
                  <tr key={sale.id} className="group hover:bg-white/1 transition-all">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-app-muted font-mono text-[11px] font-black uppercase">
                         <Calendar size={12} /> {new Date(sale.created_at).toLocaleDateString(i18n.language)}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-black text-xs">{sale.clients?.full_name?.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-black text-white uppercase">{sale.clients?.full_name || t('general')}</p>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-gray-800 text-gray-500">{sale.clients?.client_type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-sm font-black text-white uppercase truncate max-w-50">{sale.products?.name_uz}</p>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] text-gray-600 font-mono font-black uppercase">SKU: {sale.products?.sku}</span>
                             <span className="flex items-center gap-1 text-[10px] text-primary font-black uppercase"><Ruler size={10} /> {Number(sale.quantity).toFixed(2)} {isTek ? 'm²' : 'm'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border",
                        sale.status === 'completed' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                      )}>
                        {sale.status === 'completed' ? t('completed') : t('debt')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-white tracking-tighter text-lg">
                       {convert(sale.total_amount)}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => { setSelectedSale(sale); setIsReturnOpen(true); }} className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all active:scale-90">
                         <RotateCcw size={16} strokeWidth={3} />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-700 font-black uppercase text-[10px] tracking-widest">{t('no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <POSModal 
        isOpen={isPOSOpen} 
        onClose={() => setIsPOSOpen(false)} 
        onSuccess={fetchSales} 
      />

      <ReturnModal 
        isOpen={isReturnOpen} 
        onClose={() => setIsReturnOpen(false)} 
        onSuccess={fetchSales} 
        saleData={selectedSale} 
      />
    </div>
  );
}