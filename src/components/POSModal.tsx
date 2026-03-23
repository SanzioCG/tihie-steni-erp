import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShoppingCart, Loader2, CheckCircle2, 
  Search, ChevronDown, Trash2, Plus, 
  Check, Package 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { cn } from '../utils';

export default function POSModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // Form statelari
  const [clientId, setClientId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [sellLength, setSellLength] = useState('');
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

  // 1. KATEGORIYA O'ZGARISHI (Xatoni to'g'irlaydigan funksiya)
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

  const addToCart = () => {
    if (!clientId || !selectedBatchId || !sellLength) return alert("Ma'lumotlarni to'ldiring!");
    const batch = batches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    const isTekstil = batch.products?.categories?.name_uz?.toLowerCase().includes('tekstil');
    const soldQty = isTekstil ? (Number(sellLength) * Number(batch.width_m || 1)) : Number(sellLength);

    if (batch.remaining_quantity < soldQty) return alert("Omborda yetarli qoldiq yo'q!");

    setCart([...cart, {
      id: Math.random().toString(),
      batch_id: batch.id,
      product_name: searchTerm,
      length: Number(sellLength),
      total_qty: soldQty,
      price: Number(sellPrice),
      total_price: soldQty * Number(sellPrice),
      isTekstil,
      purchase_price: batch.purchase_price
    }]);
    
    // Reset selection fields
    setSelectedProdId(''); setSelectedBatchId(''); setSellLength(''); setSellPrice(''); setSearchTerm(''); setBatches([]);
  };

  const totalCartSum = cart.reduce((sum, item) => sum + item.total_price, 0);
  const debtAmount = totalCartSum - Number(paidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Savatcha bo'sh!");
    setLoading(true);
    try {
      for (const item of cart) {
        const { data: bData } = await supabase.from('batches').select('remaining_quantity').eq('id', item.batch_id).single();
        await supabase.from('batches').update({ remaining_quantity: bData.remaining_quantity - item.total_qty }).eq('id', item.batch_id);
        
        await supabase.from('sales').insert([{ 
          client_id: clientId, 
          total_amount: item.total_price, 
          total_profit: (item.price - item.purchase_price) * item.total_qty, 
          quantity: item.total_qty, 
          status: debtAmount <= 0 ? 'completed' : 'pending' 
        }]);

        await supabase.from('audit_logs').insert([{
          action: 'CREATED',
          entity: 'SOTUV',
          details: `${item.product_name} sotildi: ${item.total_qty.toFixed(2)}`,
          user_name: 'Admin'
        }]);
      }

      if (Number(paidAmount) > 0) {
        await supabase.from('transactions').insert([{ type: 'income', category: 'Sotuv', amount: Number(paidAmount), description: `Sotuv (${cart.length} xil mahsulot)` }]);
      }

      const client = clients.find(c => c.id === clientId);
      await supabase.from('clients').update({ balance: (client?.balance || 0) - debtAmount }).eq('id', clientId);
      
      onSuccess(); onClose();
      alert("Savdo yakunlandi!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-2 md:p-4 overflow-y-auto bg-black/90 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
        className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-2xl p-6 md:p-8 space-y-6 my-auto"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
            <ShoppingCart className="text-primary" size={20} /> Yangi Sotuv
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        {/* 1. MIJOZ TANLASH */}
        <div className="space-y-1 text-left">
          <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Mijoz</label>
          <select className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="" className="bg-black text-gray-500">Mijoz tanlang...</option>
            {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
          </select>
        </div>

        {/* 2. MAHSULOT QO'SHISH BO'LIMI */}
        <div className="p-5 bg-white/2 border border-white/5 rounded-4xl space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <select className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-bold outline-none" value={selectedCatId} onChange={e => handleCatChange(e.target.value)}>
              <option value="" className="bg-black">Kategoriya...</option>
              {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
            </select>
            <div className="relative" ref={dropdownRef}>
              <div onClick={() => selectedCatId && setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white flex justify-between items-center cursor-pointer text-[11px] font-bold">
                <span className="truncate">{selectedProdId ? searchTerm : "Mahsulot..."}</span>
                <Search size={14} className="text-gray-600" />
              </div>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-xl z-160 overflow-hidden shadow-2xl max-h-40 overflow-y-auto no-scrollbar">
                  {allProducts.filter(p => p.category_id === selectedCatId).map(p => (
                    <div key={p.id} onClick={() => handleProductSelect(p)} className="px-4 py-3 hover:bg-primary/10 text-[11px] text-white cursor-pointer border-b border-white/2">{p.name_uz}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {batches.length > 0 && (
             <div className="grid grid-cols-1 gap-2">
               {batches.map(b => (
                 <div key={b.id} onClick={() => { setSelectedBatchId(b.id); setSellPrice(b.selling_price.toString()); }}
                   className={cn("p-3 rounded-xl border text-[10px] font-bold flex justify-between items-center cursor-pointer transition-all", selectedBatchId === b.id ? "bg-primary/10 border-primary text-white" : "bg-white/5 border-white/5 text-gray-500")}>
                    <span>{b.width_m ? `Eni: ${b.width_m}m | Qolgan: ${b.remaining_quantity}m²` : `L: ${b.length_m}m | Qolgan: ${b.remaining_quantity}m`}</span>
                    {selectedBatchId === b.id && <Check size={14} className="text-primary" />}
                 </div>
               ))}
             </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <input type="number" placeholder="Metr" className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm outline-none font-bold" value={sellLength} onChange={e => setSellLength(e.target.value)} />
             <input type="number" placeholder="Narxi" className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-primary font-black text-sm outline-none" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
          </div>

          <button type="button" onClick={addToCart} className="w-full py-3.5 bg-white/5 hover:bg-primary hover:text-black text-primary font-black rounded-xl transition-all uppercase text-[10px] tracking-widest flex justify-center items-center gap-2">
            <Plus size={14} /> Savatchaga qo'shish
          </button>
        </div>

        {/* 3. SAVATCHA RO'YXATI */}
        {cart.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1 no-scrollbar">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white/2 border border-white/5 rounded-xl animate-in slide-in-from-right-4">
                <div className="text-[10px] font-bold text-left uppercase">
                  <p className="text-white truncate max-w-37.5">{item.product_name}</p>
                  <p className="text-gray-500">{item.length}m = {item.total_qty.toFixed(2)}{item.isTekstil ? 'm²' : 'm'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-primary font-mono">${item.total_price.toLocaleString()}</span>
                  <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. TOTAL & PAYMENT */}
        <div className="pt-4 border-t border-white/5 space-y-4 text-left">
          <div className="flex justify-between items-center px-2">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Jami Summa:</span>
             <span className="text-2xl font-black text-white italic tracking-tighter">${totalCartSum.toLocaleString()}</span>
          </div>
          <input type="number" className="w-full px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xl font-black outline-none text-center" placeholder="To'langan Summa ($)" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          
          <button disabled={loading || cart.length === 0} onClick={handleSubmit} className="w-full py-5 bg-primary text-black font-black rounded-3xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all uppercase text-[11px] tracking-widest flex justify-center items-center gap-3">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} Savdoni Yakunlash
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}