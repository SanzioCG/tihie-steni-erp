import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Calculator, Plus, Trash2, Search, 
  FileDown, Save, History 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, cn } from '../lib/utils';
import { unitLabel } from '../lib/units';
import toast from 'react-hot-toast';
import { useCommercialOffers } from '../hooks/queries/useQueries';

// Miqdor hisobи mahsulot birligиdan (kategoriyadan emas):
//   m2  → kenglik × uzunlik ;  p.m → uzunlik × soni ;  pcs → soni
type Dims = { width_m: string; length_m: string; item_count: string; price: string };
const calcQty = (unit: string, d: Dims): number => {
  const w = Number(d.width_m || 0);
  const l = Number(d.length_m || 0);
  const c = Number(d.item_count || 0);
  if (unit === 'm2') return w * l;
  if (unit === 'pcs') return c;
  return l * c; // p.m
};

export default function KP() {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  
  const { data: kpHistory = [], refetch: fetchKpHistory } = useCommercialOffers();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [clientId, setClientId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dims, setDims] = useState({ width_m: '', length_m: '', item_count: '1', price: '' });

  const fetchData = async () => {
    const { data: c } = await supabase.from('categories').select('*').order('name_uz');
    const { data: p } = await supabase.from('products').select('*');
    const { data: cl } = await supabase.from('clients').select('*').order('full_name');
    
    if (c) setCategories(c);
    if (p) setAllProducts(p);
    if (cl) setClients(cl);
  };

  useEffect(() => { 
    fetchData(); 
    const handleClick = (e: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false); 
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCatChange = (id: string) => {
    setSelectedCatId(id);
    setSelectedProdId('');
    setFilteredProducts(allProducts.filter(p => p.category_id === id));
    setSearchTerm('');
    setBatches([]);
    setDims({ width_m: '', length_m: '', item_count: '1', price: '' });
  };

  const handleProductSelect = async (prod: any) => {
    setSelectedProdId(prod.id);
    setSearchTerm(prod.name_uz);
    setIsDropdownOpen(false);
    const { data: b } = await supabase.from('batches').select('*').eq('product_id', prod.id).gt('remaining_quantity', 0);
    if (b) {
      setBatches(b);
      if (b.length > 0) {
        setDims({ ...dims, width_m: b[0].width_m || '', price: b[0].selling_price.toString(), length_m: '' });
      }
    }
  };

  const addToCart = () => {
    if (!selectedProdId) return toast.error(t('fill_fields'));
    const product = allProducts.find(p => p.id === selectedProdId);
    const u = product?.unit || 'm2';

    // Birlikка qarab majburiy maydonlar
    if (u === 'm2' && (!dims.width_m || !dims.length_m)) return toast.error(t('fill_fields'));
    if (u === 'p.m' && !dims.length_m) return toast.error(t('fill_fields'));
    if (u === 'pcs' && !dims.item_count) return toast.error(t('fill_fields'));

    const qty = calcQty(u, dims);
    if (!(qty > 0)) return toast.error(t('fill_fields'));

    const details =
      u === 'm2' ? `E: ${dims.width_m}m x B: ${dims.length_m}m`
      : u === 'pcs' ? `${dims.item_count} ${unitLabel('pcs', t)}`
      : `L: ${dims.length_m}m x ${dims.item_count}ta`;

    setCart([...cart, {
      id: Math.random().toString(),
      product_name: searchTerm,
      qty: qty,
      price: Number(dims.price),
      total: qty * Number(dims.price),
      details,
      unit: unitLabel(u, t)
    }]);
    setDims({ width_m: '', length_m: '', item_count: '1', price: '' });
    setSelectedProdId(''); 
    setSearchTerm('');
  };

  const saveAndExport = async () => {
    if (cart.length === 0 || !clientId) return toast.error(t('select_client_err'));
    setLoading(true);
    const totalSum = cart.reduce((sum, item) => sum + item.total, 0);
    const selectedClient = clients.find(c => c.id === clientId);

    const { data: offer, error } = await supabase
      .from('commercial_offers')
      .insert([{ items: cart, total_amount: totalSum, client_id: clientId }])
      .select('id')
      .single();

    if (!error) {
      // KP saqlanganda voronkada bitim: ochiq bitim bo'lsa uni offer_sent'ga
      // ko'chir, aks holda yangi bitim yarat (stage=offer_sent)
      try {
        const { data: openDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('client_id', clientId)
          .not('stage', 'in', '(won,lost)')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openDeal) {
          await supabase.rpc('move_deal_stage', { p_deal_id: openDeal.id, p_stage: 'offer_sent' });
          await supabase.from('deals').update({ offer_id: offer?.id, expected_amount: totalSum }).eq('id', openDeal.id);
        } else {
          await supabase.from('deals').insert([{
            client_id: clientId,
            title: `KP — ${selectedClient?.full_name || ''}`.trim(),
            stage: 'offer_sent',
            expected_amount: totalSum,
            offer_id: offer?.id,
            owner_id: profile?.id || null,
            created_by: profile?.id || null,
          }]);
        }
      } catch (dealErr) {
        // Bitim yaratilmasa ham KP saqlangan — jarayonni to'xtatmaymiz
        console.error('Deal sync failed:', dealErr);
      }

      await exportToPDF(
        "Tijorat_Taklifi",
        [["MAHSULOT", "TAFSILOT", "MIQDOR", "JAMI"]],
        cart.map(i => [i.product_name, i.details, `${i.qty.toFixed(2)} ${i.unit}`, convert(i.total)]),
        { name: selectedClient?.full_name, phone: selectedClient?.phone, total: convert(totalSum) }
      );
      setCart([]); 
      setClientId('');
      fetchKpHistory();
      toast.success(t('offer_saved'));
    } else {
      toast.error("Xatolik: " + error.message);
    }
    setLoading(false);
  };

  const totalSum = cart.reduce((sum, item) => sum + item.total, 0);

  // Tanlangan mahsulot birligi — forma maydonlari va hisob shundan (fallback m2)
  const selectedUnit = allProducts.find(p => p.id === selectedProdId)?.unit || 'm2';

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 font-sans">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-2xl font-bold uppercase tracking-tighter text-primary">{t('kp')}</h2>
        <button onClick={() => setShowHistory(!showHistory)} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 font-bold text-[10px] uppercase">
          <History size={18} /> {showHistory ? t('calculator') : t('view_history')}
        </button>
      </div>

      {!showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mx-2">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wide ml-2">1. {t('select_client')}</label>
                <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none text-sm cursor-pointer" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="" className="bg-black">{t('select_client')}...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">2. {t('category')}</label>
                <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none text-sm" value={selectedCatId} onChange={e => handleCatChange(e.target.value)}>
                  <option value="" className="bg-black">{t('save')}...</option>
                  {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
                </select>
              </div>

              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">3. {t('search_product')}</label>
                <div className="relative">
                  <input 
                    value={searchTerm}
                    onChange={e => { 
                      setSearchTerm(e.target.value); 
                      setIsDropdownOpen(true);
                      if (selectedProdId) {
                        setSelectedProdId('');
                        setDims({ width_m: '', length_m: '', item_count: '1', price: '' });
                      }
                    }}
                    onFocus={() => selectedCatId && setIsDropdownOpen(true)}
                    disabled={!selectedCatId}
                    placeholder={t('search_product')}
                    className={cn(
                      "w-full px-5 py-4 pr-12 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold text-sm uppercase",
                      !selectedCatId && "opacity-20 cursor-not-allowed"
                    )}
                  />
                  <Search size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                  
                  {isDropdownOpen && selectedCatId && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-50 overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                      {allProducts.filter(p => 
                        p.name_uz.toLowerCase().includes(searchTerm.toLowerCase()) && 
                        p.category_id === selectedCatId
                      ).map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleProductSelect(p)} 
                          className="px-6 py-4 hover:bg-primary/10 text-xs text-white font-bold cursor-pointer border-b border-white/2 uppercase"
                        >
                          {p.name_uz}
                        </div>
                      ))}
                      {allProducts.filter(p => 
                        p.name_uz.toLowerCase().includes(searchTerm.toLowerCase()) && 
                        p.category_id === selectedCatId
                      ).length === 0 && (
                        <div className="px-6 py-4 text-xs text-gray-500 font-bold uppercase">Topilmadi</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedProdId && (
                <div className="grid grid-cols-2 gap-4 p-6 bg-white/2 border border-white/5 rounded-3xl">
                  {/* Maydonlar mahsulot birligiga qarab (kategoriyadан emas) */}
                  {selectedUnit === 'm2' && (
                    <>
                      <input type="number" placeholder={t('width_m')} value={dims.width_m} onChange={e => setDims({...dims, width_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-bold outline-none" />
                      <input type="number" placeholder={t('length_m')} value={dims.length_m} onChange={e => setDims({...dims, length_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-bold outline-none" />
                    </>
                  )}
                  {selectedUnit === 'p.m' && (
                    <>
                      <input type="number" placeholder={t('length_m')} value={dims.length_m} onChange={e => setDims({...dims, length_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-bold outline-none" />
                      <input type="number" placeholder={t('count_pcs')} value={dims.item_count} onChange={e => setDims({...dims, item_count: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-bold outline-none" />
                    </>
                  )}
                  {selectedUnit === 'pcs' && (
                    <input type="number" placeholder={t('count_pcs')} value={dims.item_count} onChange={e => setDims({...dims, item_count: e.target.value})} className="col-span-2 w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-bold outline-none" />
                  )}
                  <input type="number" placeholder={t('price_label')} value={dims.price} onChange={e => setDims({...dims, price: e.target.value})} className="col-span-2 mt-2 w-full bg-transparent border-b border-white/10 py-2 text-emerald-500 text-xl font-bold outline-none" />
                </div>
              )}

              <button onClick={addToCart} className="w-full py-5 bg-primary text-black font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] tracking-wide flex items-center justify-center gap-2">
                <Plus size={18} strokeWidth={4} /> {t('add_to_cart')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col">
             <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-2xl flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                   {cart.length > 0 ? (
                     <table className="w-full text-left border-collapse">
                       <thead className="text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">
                        <tr><th className="pb-4">{t('products')}</th><th className="pb-4 text-center">{t('details')}</th><th className="pb-4 text-right">{t('total')}</th><th className="pb-4"></th></tr>
                       </thead>
                       <tbody className="divide-y divide-white/3">
                          {cart.map(i => (
                            <tr key={i.id} className="group">
                               <td className="py-2.5 font-bold text-white text-[13px] uppercase">{i.product_name}</td>
                               <td className="py-2.5 text-center text-[10px] text-gray-400 font-bold uppercase">{i.details} = {i.qty.toFixed(2)}{i.unit}</td>
                               <td className="py-2.5 text-right font-bold text-primary text-[13px]">${i.total.toLocaleString()}</td>
                               <td className="py-2.5 text-right"><button onClick={() => setCart(cart.filter(c => c.id !== i.id))} className="p-2 text-gray-700 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 py-20"><Calculator size={64} strokeWidth={1} /><p className="text-[10px] font-bold uppercase tracking-wide">{t('cart_empty')}</p></div>
                   )}
                </div>

                <div className="mt-auto pt-5 border-t border-white/5 flex justify-between items-end">
                   <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{t('selected_client')}:</p>
                    <p className="text-xl font-bold text-white uppercase">{clients.find(c => c.id === clientId)?.full_name || t('not_selected')}</p>
                   </div>
                   <div className="text-right flex items-center gap-6">
                      <div><p className="text-[10px] font-bold text-primary uppercase mb-1 tracking-wide">{t('total_bill')}:</p><h3 className="text-2xl font-bold text-white tracking-tighter italic">{convert(totalSum)}</h3></div>
                      {cart.length > 0 && <button onClick={saveAndExport} disabled={loading} className="p-5 bg-primary text-black rounded-3xl shadow-lg hover:scale-110 transition-all"><Save size={24} /></button>}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0c0c0e] border border-white/5 rounded-4xl overflow-hidden shadow-2xl mx-2">
           <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-primary border-b border-white/5">
                 <tr><th className="px-8 py-6 text-[10px] font-bold uppercase">{t('date')}</th><th className="px-8 py-6 text-[10px] font-bold uppercase">{t('client')}</th><th className="px-8 py-6 text-[10px] font-bold uppercase text-right">{t('total')}</th><th className="px-8 py-6 text-[10px] font-bold uppercase text-center">{t('actions')}</th></tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                 {kpHistory.map((h: any) => (
                   <tr key={h.id} className="group hover:bg-white/1">
                      <td className="px-8 py-6 text-gray-400 font-bold text-xs uppercase">{new Date(h.created_at).toLocaleString(i18n.language)}</td>
                      <td className="px-8 py-6 text-white font-bold text-sm uppercase">{h.clients?.full_name}</td>
                      <td className="px-8 py-6 text-right text-emerald-500 font-bold text-lg tracking-tighter">{convert(h.total_amount)}</td>
                      <td className="px-8 py-6 text-center">
                         <button onClick={() => exportToPDF("Tijorat_Taklifi", [["MAHSULOT", "JAMI"]], h.items.map((i:any) => [i.product_name, convert(i.total)]), {name: h.clients?.full_name, phone: h.clients?.phone, total: convert(h.total_amount)})} className="p-3 bg-white/5 rounded-xl hover:bg-primary/20 text-primary transition-all active:scale-90"><FileDown size={18}/></button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}