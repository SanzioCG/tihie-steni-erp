import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Calculator, Plus, Trash2, Search, ChevronDown, 
  Check, Ruler, FileDown, Package, Save, History, User, X 
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // QO'SHILDI
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAuthStore } from '../store/useAuthStore';
import { generatePDF } from '../lib/exportPDF';
import { cn } from '../lib/utils';

export default function KP() {
  const { t, i18n } = useTranslation(); // QO'SHILDI
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [kpHistory, setKpHistory] = useState<any[]>([]);

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
    const { data: h } = await supabase.from('commercial_offers').select('*, clients(full_name, phone)').order('created_at', { ascending: false });
    
    if (c) setCategories(c);
    if (p) setAllProducts(p);
    if (cl) setClients(cl);
    if (h) setKpHistory(h);
  };

  useEffect(() => { 
    fetchData(); 
    const handleClick = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCatChange = (id: string) => {
    setSelectedCatId(id);
    setSelectedProdId('');
    setFilteredProducts(allProducts.filter(p => p.category_id === id));
    setSearchTerm('');
    setBatches([]);
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
    if (!selectedProdId || !dims.length_m) return alert(t('fill_fields'));
    const isTek = categories.find(c => c.id === selectedCatId)?.name_uz?.toLowerCase().includes('tekstil');
    const qty = isTek ? (Number(dims.width_m) * Number(dims.length_m)) : (Number(dims.length_m) * Number(dims.item_count));
    
    setCart([...cart, {
      id: Math.random().toString(),
      product_name: searchTerm,
      qty: qty,
      price: Number(dims.price),
      total: qty * Number(dims.price),
      details: isTek ? `E: ${dims.width_m}m x B: ${dims.length_m}m` : `L: ${dims.length_m}m x ${dims.item_count}ta`,
      unit: isTek ? 'm²' : 'm'
    }]);
    setDims({ ...dims, length_m: '', price: '' });
    setSelectedProdId(''); setSearchTerm('');
  };

  const saveAndExport = async () => {
    if (cart.length === 0 || !clientId) return alert(t('select_client_err'));
    setLoading(true);
    const totalSum = cart.reduce((sum, item) => sum + item.total, 0);
    const selectedClient = clients.find(c => c.id === clientId);

    const { error } = await supabase.from('commercial_offers').insert([{ items: cart, total_amount: totalSum, client_id: clientId }]);
    
    if (!error) {
      await generatePDF(
        t('offer_title'), 
        [[t('products'), t('details'), t('qoldiq'), t('amount')]], 
        cart.map(i => [i.product_name, i.details, `${i.qty.toFixed(2)} ${i.unit}`, convert(i.total)]),
        { name: selectedClient.full_name, phone: selectedClient.phone, total: convert(totalSum) }
      );
      setCart([]); setClientId(''); fetchData();
      alert(t('offer_saved'));
    }
    setLoading(false);
  };

  const totalSum = cart.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 font-sans">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">{t('kp')}</h2>
        <button onClick={() => setShowHistory(!showHistory)} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase">
          <History size={18} /> {showHistory ? t('calculator') : t('view_history')}
        </button>
      </div>

      {!showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mx-2">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0c0c0e] border border-white/5 rounded-4xl p-8 shadow-2xl space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-2">1. {t('select_client')}</label>
                <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none text-sm cursor-pointer" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="" className="bg-black">{t('select_client')}...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">2. {t('category')}</label>
                <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none text-sm" value={selectedCatId} onChange={e => handleCatChange(e.target.value)}>
                  <option value="" className="bg-black">{t('save')}...</option>
                  {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
                </select>
              </div>

              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">3. {t('search_product')}</label>
                <div onClick={() => selectedCatId && setIsDropdownOpen(!isDropdownOpen)} className={cn("w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white flex justify-between items-center cursor-pointer font-bold text-sm mt-1", !selectedCatId && "opacity-20")}>
                  <span className="truncate">{selectedProdId ? searchTerm : t('search_product')}</span>
                  <Search size={18} className="text-primary" />
                </div>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-2xl z-50 overflow-hidden shadow-2xl">
                     <input autoFocus className="w-full p-4 bg-white/5 border-b border-white/10 outline-none text-white text-xs font-black" onChange={e => setSearchTerm(e.target.value)} placeholder={t('search_product')} />
                     <div className="max-h-48 overflow-y-auto">
                       {allProducts.filter(p => p.name_uz.toLowerCase().includes(searchTerm.toLowerCase()) && p.category_id === selectedCatId).map(p => (
                         <div key={p.id} onClick={() => handleProductSelect(p)} className="px-6 py-4 hover:bg-primary/10 text-xs text-white font-black cursor-pointer border-b border-white/2 uppercase">{p.name_uz}</div>
                       ))}
                     </div>
                  </div>
                )}
              </div>

              {selectedProdId && (
                <div className="grid grid-cols-2 gap-4 p-6 bg-white/2 border border-white/5 rounded-3xl">
                  <input type="number" placeholder={t('width_m')} value={dims.width_m} onChange={e => setDims({...dims, width_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-black outline-none" />
                  <input type="number" placeholder={t('length_m')} value={dims.length_m} onChange={e => setDims({...dims, length_m: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-lg font-black outline-none" />
                  <input type="number" placeholder={t('price_label')} value={dims.price} onChange={e => setDims({...dims, price: e.target.value})} className="col-span-2 mt-2 w-full bg-transparent border-b border-white/10 py-2 text-emerald-500 text-xl font-black outline-none" />
                </div>
              )}

              <button onClick={addToCart} className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                <Plus size={18} strokeWidth={4} /> {t('add_to_cart')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col">
             <div className="bg-[#0c0c0e] border border-white/5 rounded-4xl p-10 shadow-2xl flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                   {cart.length > 0 ? (
                     <table className="w-full text-left border-collapse">
                       <thead className="text-[10px] font-black text-gray-600 uppercase border-b border-white/5">
                        <tr><th className="pb-6">{t('products')}</th><th className="pb-6 text-center">{t('details')}</th><th className="pb-6 text-right">{t('total')}</th><th className="pb-6"></th></tr>
                       </thead>
                       <tbody className="divide-y divide-white/3">
                          {cart.map(i => (
                            <tr key={i.id} className="group">
                               <td className="py-6 font-black text-white text-sm uppercase">{i.product_name}</td>
                               <td className="py-6 text-center text-[10px] text-gray-500 font-black uppercase">{i.details} = {i.qty.toFixed(2)}{i.unit}</td>
                               <td className="py-6 text-right font-black text-primary text-sm">${i.total.toLocaleString()}</td>
                               <td className="py-6 text-right"><button onClick={() => setCart(cart.filter(c => c.id !== i.id))} className="p-2 text-gray-700 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 py-20"><Calculator size={64} strokeWidth={1} /><p className="text-[10px] font-black uppercase tracking-[0.5em]">{t('cart_empty')}</p></div>
                   )}
                </div>

                <div className="mt-auto pt-8 border-t border-white/5 flex justify-between items-end">
                   <div className="text-left">
                    <p className="text-[10px] font-black text-gray-600 uppercase">{t('selected_client')}:</p>
                    <p className="text-xl font-black text-white uppercase">{clients.find(c => c.id === clientId)?.full_name || t('not_selected')}</p>
                   </div>
                   <div className="text-right flex items-center gap-6">
                      <div><p className="text-[10px] font-black text-primary uppercase mb-1 tracking-widest">{t('total_bill')}:</p><h3 className="text-4xl font-black text-white tracking-tighter italic">{convert(totalSum)}</h3></div>
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
                 <tr><th className="px-8 py-6 text-[10px] font-black uppercase">{t('date')}</th><th className="px-8 py-6 text-[10px] font-black uppercase">{t('client')}</th><th className="px-8 py-6 text-[10px] font-black uppercase text-right">{t('total')}</th><th className="px-8 py-6 text-[10px] font-black uppercase text-center">{t('actions')}</th></tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                 {kpHistory.map(h => (
                   <tr key={h.id} className="group hover:bg-white/1">
                      <td className="px-8 py-6 text-gray-500 font-bold text-xs uppercase">{new Date(h.created_at).toLocaleString(i18n.language)}</td>
                      <td className="px-8 py-6 text-white font-black text-sm uppercase">{h.clients?.full_name}</td>
                      <td className="px-8 py-6 text-right text-emerald-500 font-black text-lg tracking-tighter">{convert(h.total_amount)}</td>
                      <td className="px-8 py-6 text-center">
                         <button onClick={() => generatePDF(t('offer_title'), [[t('products'), t('total')]], h.items.map((i:any) => [i.product_name, convert(i.total)]), {name: h.clients?.full_name, phone: h.clients?.phone, total: convert(h.total_amount)})} className="p-3 bg-white/5 rounded-xl hover:bg-primary/20 text-primary transition-all active:scale-90"><FileDown size={18}/></button>
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