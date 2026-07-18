import { useState } from 'react';
import { Loader2, Edit3, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';
import InboundModal from '../components/modals/InboundModal';
import { useStock } from '../hooks/queries/useQueries';

export default function Stock() {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();
  
  const { data: stocks = [], isLoading: loading, refetch: fetchStock } = useStock();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  return (
    <div className="space-y-5 text-left p-2 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">
          {t('stock_inventory')}
        </h2>
        <button onClick={() => { setEditingBatch(null); setIsInboundOpen(true); }} className="px-8 py-3.5 bg-primary text-black font-bold rounded-2xl shadow-lg uppercase text-[11px]">
          + {t('new_inbound')}
        </button>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative min-h-125">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-300">
            <thead className="bg-white/5 text-primary border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[9px] font-bold uppercase text-center w-16">#</th>
                <th className="px-6 py-4 text-[9px] font-bold uppercase">{t('batch')}</th>
                <th className="px-6 py-4 text-[9px] font-bold uppercase">{t('image')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-center">{t('sku')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-center">{t('category')}</th>
                <th className="px-6 py-4 text-[9px] font-bold">{t('series_name')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-center">{t('size')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-center">{t('qoldiq')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-right">{t('tan_narx')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-right">{t('sotuv_narxi')}</th>
                <th className="px-6 py-4 text-[9px] font-bold text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {stocks.map((batch: any, index: number) => {
                const isTek = batch.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
                return (
                  <tr key={batch.id} className="group hover:bg-white/1 transition-all text-white font-medium">
                    <td className="px-6 py-2.5 text-gray-700 font-bold text-xs text-center">{index + 1}</td>
                    <td className="px-6 py-2.5 font-mono text-sm font-bold text-gray-400">{batch.batch_number}</td>
                    <td className="px-6 py-2.5">
                       <div onClick={() => batch.products?.image_url && setSelectedImage(batch.products.image_url)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer relative group/img">
                          {batch.products?.image_url ? (
                            <img src={batch.products.image_url} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                          ) : <Package className="w-full h-full p-3 text-gray-800" />}
                       </div>
                    </td>
                    <td className="px-6 py-2.5 text-center font-mono text-[10px] text-gray-400 uppercase">{batch.products?.sku}</td>
                    <td className="px-6 py-2.5 text-center font-bold text-[10px] uppercase text-primary/70">{batch.products?.categories?.name_uz}</td>
                    <td className="px-6 py-2.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{batch.products?.series}</p>
                      <p className="text-sm font-bold uppercase truncate max-w-37.5">{batch.products?.name_uz}</p>
                    </td>
                    <td className="px-6 py-2.5 text-center">
                       <span className="text-[10px] font-bold text-gray-400 italic">
                          {batch.width_m 
                            ? `${t('width_label')}: ${batch.width_m}m | ${t('height_label')}: ${batch.length_m}m` 
                            : `L: ${batch.length_m}m`}
                       </span>
                    </td>
                    <td className="px-6 py-2.5 text-center">
                       <div className="inline-flex px-3 py-1 bg-primary/10 text-primary rounded-xl font-bold text-sm">
                          {batch.remaining_quantity} <span className="text-[9px] ml-1 opacity-50">{isTek ? 'm²' : 'm'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-2.5 text-right font-bold text-emerald-400 font-mono text-base">{convert(batch.purchase_price)}</td>
                    <td className="px-6 py-2.5 text-right font-bold text-primary font-mono text-base">{convert(batch.selling_price)}</td>
                    <td className="px-6 py-2.5 text-center">
                       <button onClick={() => { setEditingBatch(batch); setIsInboundOpen(true); }} className="p-2.5 bg-white/5 hover:bg-primary text-gray-400 hover:text-black rounded-xl border border-white/5 transition-all">
                         <Edit3 size={16}/>
                       </button>
                    </td>
                  </tr>
                );
              })}
              {stocks.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-gray-700 font-bold uppercase text-[10px] tracking-wide">{t('no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-2000 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedImage(null)}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <img loading="lazy" decoding="async" src={selectedImage} className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl border border-white/10" alt="Zoomed" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InboundModal isOpen={isInboundOpen} onClose={() => setIsInboundOpen(false)} onSuccess={fetchStock} editData={editingBatch} />
    </div>
  );
}