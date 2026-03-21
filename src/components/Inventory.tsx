import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, Box, Edit2, Trash2, 
  Loader2, ZoomIn, PackagePlus, FileDown 
} from 'lucide-react';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils';

// Modallarni va PDF helperni import qilish
import AddProductModal from './AddProductModal';
import InboundModal from './InboundModal';
import ImageModal from './ImageModal';
import { generatePDF } from '../utils/exportPDF'; // PDF Helper

export default function Inventory() {
  const { i18n } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select(`*, categories (*), batches (quantity)` ).order('created_at', { ascending: false });
    if (data) {
      const formatted = data.map((p: any) => ({
        ...p, totalStock: p.batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0
      }));
      setProducts(formatted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  // PDF Eksport Funksiyasi
  const exportPDF = () => {
    const headers = [["SERIYA", "NOMI", "RANG", "SKU", "QOLDIQ"]];
    const dataRows = products.map(p => [
      p.series || '-', 
      p.name_uz, 
      p.attribute || '-', 
      p.sku, 
      `${p.totalStock} ${p.unit}`
    ]);
    generatePDF("Mahsulotlar Katalogi", headers, dataRows);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Mahsulotni o'chirishga aminmisiz?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const filteredData = products.filter(p => 
    p.name_uz?.toLowerCase().includes(search.toLowerCase()) || 
    p.series?.toLowerCase().includes(search.toLowerCase()) ||
    p.attribute?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left text-app-fg">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase ">Mahsulot Katalogi</h2>
          <p className="text-sm text-app-muted italic">Katalogdagi jami mahsulotlar: {products.length} ta</p>
        </div>
        <div className="flex gap-3">
          {/* PDF TUGMASI */}
          <button 
            onClick={exportPDF}
            className="px-6 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest"
          >
            <FileDown size={18} className="text-primary" /> PDF Eksport
          </button>
          {/* YANGI MAHSULOT TUGMASI */}
          <button 
            onClick={() => { setSelectedProduct(null); setIsAddOpen(true); }} 
            className="px-8 py-3.5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] transition-all uppercase tracking-widest text-[11px] flex items-center gap-2"
          >
            <Plus size={20} /> Yangi Mahsulot
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-primary transition-colors" size={18} />
          <input type="text" placeholder="Qidirish (Seriya, Nomi, Rang)..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-app-card border border-app-border rounded-2xl text-app-fg outline-none focus:border-primary/40 transition-all" />
      </div>

      {/* TABLE */}
      <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-xl min-h-112.5px relative">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-bg/50"><Loader2 className="animate-spin text-primary" size={40} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-app-border bg-app-fg/2">
                <th className="px-8 py-6 text-[10px] font-black text-app-muted uppercase tracking-[0.2em]">Mahsulot (Katalog)</th>
                <th className="px-8 py-6 text-[10px] font-black text-app-muted uppercase tracking-[0.2em] text-center">Kategoriya</th>
                <th className="px-8 py-6 text-[10px] font-black text-app-muted uppercase tracking-[0.2em] text-center">SKU</th>
                <th className="px-8 py-6 text-[10px] font-black text-app-muted uppercase tracking-[0.2em] text-center">Qoldiq</th>
                <th className="px-8 py-6 text-[10px] font-black text-app-muted uppercase tracking-[0.2em] text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredData.map((item) => (
                <tr key={item.id} className="group hover:bg-white/1.0 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4 text-left">
                      <div onClick={() => item.image_url && setZoomImg(item.image_url)} className="relative w-14 h-14 rounded-xl bg-app-fg/5 border border-app-border flex items-center justify-center overflow-hidden cursor-zoom-in group/img">
                        {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Box size={22} className="text-app-muted" />}
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all"><ZoomIn size={16} className="text-white" /></div>
                      </div>
                      <div>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{item.series || 'KOMFORT'}</p>
                        <p className="text-sm font-bold">{item.name_uz}</p>
                        <p className="text-[10px] text-app-muted italic font-medium">{item.attribute || 'Standart'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center"><span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase border bg-app-fg/5 border-app-border">{item.categories?.name_uz}</span></td>
                  <td className="px-8 py-5 text-center font-mono text-[11px] text-app-muted italic">{item.sku}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={cn("text-sm font-bold tracking-tighter", item.totalStock <= 0 ? "text-rose-500" : "text-emerald-500")}>
                        {item.totalStock} {item.unit}
                    </span>
                  </td>
                  {/* AMALLAR TUGMALARI SHU YERDA */}
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedProduct(item); setIsInboundOpen(true); }} 
                        className="p-2.5 text-primary bg-primary/5 hover:bg-primary/20 rounded-xl transition-all" 
                        title="Kirim qilish"
                      >
                        <PackagePlus size={18}/>
                      </button>
                      <button 
                        onClick={() => { setSelectedProduct(item); setIsAddOpen(true); }} 
                        className="p-2.5 text-blue-400 bg-blue-400/5 hover:bg-blue-400/20 rounded-xl transition-all"
                      >
                        <Edit2 size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2.5 text-rose-500 bg-rose-500/5 hover:bg-rose-500/20 rounded-xl transition-all"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALLAR */}
      <AddProductModal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setSelectedProduct(null); }} onSuccess={fetchProducts} initialData={selectedProduct} />
      <InboundModal isOpen={isInboundOpen} onClose={() => { setIsInboundOpen(false); setSelectedProduct(null); }} onSuccess={fetchProducts} initialProduct={selectedProduct} />
      <ImageModal src={zoomImg || ''} isOpen={!!zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
}