import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShoppingCart, Loader2, CheckCircle2, 
  Search, ChevronDown, Trash2, Plus, 
  Check, Package, Ruler, Box, Wallet 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { cn } from '../utils';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next'; // QO'SHILDI

export default function POSModal({ isOpen, onClose, onSuccess }: any) {
  const { t, i18n } = useTranslation(); // QO'SHILDI
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  
  const [sellLength, setSellLength] = useState('');
  const [sellCount, setSellCount] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: c } = await supabase.from('categories').select('*').order('name_uz');
      const { data: p } = await supabase.from('products').select('*');
      const { data: cl } = await supabase.from('clients').select('*').order('full_name');
      if (c) setCategories(c);
      if (p) setAllProducts(p);
      if (cl) setClients(cl);
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleCatChange = (id: string) => {
    setSelectedCatId(id);
    setSelectedProdId('');
    setSelectedBatchId('');
    setBatches([]);
    setSearchTerm('');
  };

  const handleProductSelect = async (prod: any) => {
    setSelectedProdId(prod.id);
    setSearchTerm(prod.name_uz);
    setIsDropdownOpen(false);
    const { data: b } = await supabase.from('batches').select('*, products(categories(name_uz))').eq('product_id', prod.id).gt('remaining_quantity', 0);
    if (b) {
      setBatches(b);
      if (b.length === 1) {
        setSelectedBatchId(b[0].id);
        setSellPrice(b[0].selling_price.toString());
      }
    }
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isTekstil = selectedBatch?.products?.categories?.name_uz?.toLowerCase().includes('tekstil');

  const calculateItemQty = () => {
    const l = Number(sellLength || 0);
    const c = Number(sellCount || 1);
    const w = Number(selectedBatch?.width_m || 1);
    return isTekstil ? (l * w) : (l * c);
  };

  const addToCart = () => {
    if (!clientId || !selectedBatchId || !sellLength || !sellPrice) return alert(t('fill_fields'));
    
    const qtyToSell = calculateItemQty();
    if (selectedBatch.remaining_quantity < qtyToSell) return alert(t('insufficient_stock'));

    setCart([...cart, {
      id: Math.random().toString(),
      batch_id: selectedBatch.id,
      product_id: selectedBatch.product_id,
      product_name: searchTerm,
      length: Number(sellLength),
      count: Number(sellCount),
      total_qty: qtyToSell,
      price: Number(sellPrice),
      total_price: qtyToSell * Number(sellPrice),
      isTekstil,
      purchase_price: selectedBatch.purchase_price
    }]);
    
    setSelectedProdId(''); setSelectedBatchId(''); setSellLength(''); setSellCount('1'); setSellPrice(''); setSearchTerm(''); setBatches([]);
  };

  const totalCartSum = cart.reduce((sum, item) => sum + item.total_price, 0);
  const debtAmount = totalCartSum - Number(paidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert(t('cart_empty'));
    setLoading(true);
    try {
      for (const item of cart) {
        const { data: bData } = await supabase.from('batches').select('remaining_quantity').eq('id', item.batch_id).single();
        await supabase.from('batches').update({ remaining_quantity: bData.remaining_quantity - item.total_qty }).eq('id', item.batch_id);
        
        const profit = (item.price - item.purchase_price) * item.total_qty;
        const { error: saleErr } = await supabase.from('sales').insert([{ 
          client_id: clientId, 
          product_id: item.product_id, 
          total_amount: item.total_price, 
          total_profit: profit, 
          quantity: item.total_qty, 
          status: debtAmount <= 0 ? 'completed' : 'pending',
          paid_amount: Number(paidAmount) > 0 ? (Number(paidAmount) / cart.length) : 0
        }]);

        if (saleErr) throw saleErr;

        await supabase.from('audit_logs').insert([{
          action: 'CREATED',
          entity: 'SOTUV',
          details: `${item.product_name} ${t('sold')} (${item.total_qty.toFixed(2)})`,
          user_name: profile?.full_name || 'Admin'
        }]);
      }

      if (Number(paidAmount) > 0) {
        await supabase.from('transactions').insert([{ type: 'income', category: t('sales'), amount: Number(paidAmount), description: `${t('sales')} (${cart.length} xil mahsulot)` }]);
      }

      const client = clients.find(c => c.id === clientId);
      await supabase.from('clients').update({ balance: (client?.balance || 0) - debtAmount }).eq('id', clientId);
      
      onSuccess(); onClose();
      alert(t('sale_success'));
    } catch (err: any) { alert(t('no_data') + ": " + err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
        className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-2xl p-6 md:p-8 space-y-6 my-auto max-h-[95vh] no-scrollbar overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase flex items-center gap-2 tracking-tighter">
            <ShoppingCart className="text-primary" size={20} /> {t('new_sale')}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <div className="space-y-1 text-left">
          <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">{t('client')}</label>
          <select className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold uppercase text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="" className="bg-black">{t('select_client')}...</option>
            {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
          </select>
        </div>

        <div className="p-5 bg-white/5 border border-white/5 rounded-4xl space-y-4">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">{t('category')}</label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-black uppercase outline-none" value={selectedCatId} onChange={e => handleCatChange(e.target.value)}>
                <option value="" className="bg-black">{t('select_category_type')}</option>
                {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
              </select>
            </div>
            <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">{t('products')}</label>
              <div onClick={() => selectedCatId && setIsDropdownOpen(!isDropdownOpen)} className={cn("w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white flex justify-between items-center cursor-pointer text-[11px] font-black uppercase", !selectedCatId && "opacity-20")}>
                <span className="truncate">{selectedProdId ? searchTerm : t('search_product')}</span>
                <Search size={14} />
              </div>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-xl z-50 overflow-hidden shadow-2xl max-h-40 overflow-y-auto no-scrollbar">
                  {allProducts.filter(p => p.category_id === selectedCatId).map(p => (
                    <div key={p.id} onClick={() => handleProductSelect(p)} className="px-4 py-3 hover:bg-primary/10 text-[11px] font-bold text-white cursor-pointer border-b border-white/2 uppercase">{p.name_uz}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {batches.length > 0 && (
             <div className="grid grid-cols-1 gap-2 text-left">
               <label className="text-[9px] font-black text-primary uppercase ml-2 tracking-widest">{t('select_batch')}</label>
               {batches.map(b => (
                 <div key={b.id} onClick={() => { setSelectedBatchId(b.id); setSellPrice(b.selling_price.toString()); }}
                   className={cn("p-4 rounded-xl border text-[10px] font-black uppercase flex justify-between items-center cursor-pointer transition-all", selectedBatchId === b.id ? "bg-primary/10 border-primary text-white" : "bg-white/5 border-white/5 text-gray-500")}>
                    <span>{b.width_m ? `${t('width_label')}: ${b.width_m}m | ${t('remaining')}: ${b.remaining_quantity}m²` : `L: ${b.length_m}m | ${t('remaining')}: ${b.remaining_quantity}m`}</span>
                    {selectedBatchId === b.id && <Check size={14} strokeWidth={4} className="text-primary" />}
                 </div>
               ))}
             </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-left">
             <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-600 uppercase ml-2 tracking-widest">{t('length_m_label')}</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-lg font-black outline-none focus:border-primary" value={sellLength} onChange={e => setSellLength(e.target.value)} />
             </div>
             <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-600 uppercase ml-2 tracking-widest">{t('sotuv_narxi')} ($)</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-black text-lg outline-none focus:border-primary" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
             </div>
          </div>

          <button type="button" onClick={addToCart} className="w-full py-4 bg-white/5 hover:bg-primary hover:text-black text-primary font-black rounded-xl transition-all uppercase text-[10px] tracking-widest flex justify-center items-center gap-2">
            <Plus size={16} strokeWidth={4} /> {t('add_to_cart')}
          </button>
        </div>

        {cart.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1 no-scrollbar border-t border-white/5 pt-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="text-left uppercase">
                  <p className="text-[11px] font-black text-white truncate max-w-37.5 tracking-tight">{item.product_name}</p>
                  <p className="text-[9px] font-bold text-gray-500">{item.length}m = {item.total_qty.toFixed(2)}{item.isTekstil ? 'm²' : 'm'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-primary tracking-tighter">{convert(item.total_price)}</span>
                  <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-white/5 space-y-5 text-left">
          <div className="flex justify-between items-center px-2">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('total_bill')}:</span>
             <span className="text-3xl font-black text-white tracking-tighter">{convert(totalCartSum)}</span>
          </div>
          <input type="number" className="w-full px-5 py-5 bg-emerald-500/5 border border-emerald-500/10 rounded-4xl text-emerald-500 text-3xl font-black outline-none text-center" placeholder={t('paid_amount_placeholder')} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          <button disabled={loading || cart.length === 0} onClick={handleSubmit} className="w-full py-6 bg-primary text-black font-black rounded-3xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all uppercase text-[11px] tracking-widest flex justify-center items-center gap-3">
            {loading ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20} strokeWidth={4}/>} {t('complete_sale')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}