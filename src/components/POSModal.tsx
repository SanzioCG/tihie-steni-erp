import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShoppingCart, Loader2, CheckCircle2, 
  Search, Trash2, Plus, Check, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { cn } from '../utils';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import toast from 'react-hot-toast'; // QO'SHILDI

interface POSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function POSModal({ isOpen, onClose, onSuccess }: POSModalProps) {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // PRINT & SUCCESS STATES
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Forma state'lari
  const [clientId, setClientId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sellLength, setSellLength] = useState('');
  const [sellCount, setSellCount] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Printer funksiyasi
  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  useEffect(() => {
    const fetchData = async () => {
      const { data: c } = await supabase.from('categories').select('*').order('name_uz');
      const { data: p } = await supabase.from('products').select('*');
      const { data: cl } = await supabase.from('clients').select('*').order('full_name');
      const { data: sett } = await supabase.from('app_settings').select('*').single();
      if (c) setCategories(c);
      if (p) setAllProducts(p);
      if (cl) setClients(cl);
      if (sett) setStoreSettings(sett);
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!selectedCatId) return [];
    return allProducts.filter(p => p.category_id === selectedCatId && p.name_uz.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [selectedCatId, searchTerm, allProducts]);

  const handleProductSelect = async (prod: any) => {
    setSelectedProdId(prod.id); setSearchTerm(prod.name_uz); setIsDropdownOpen(false);
    const { data: b } = await supabase.from('batches').select('*, products(categories(name_uz))').eq('product_id', prod.id).gt('remaining_quantity', 0);
    if (b) {
      setBatches(b);
      if (b.length === 1) { setSelectedBatchId(b[0].id); setSellPrice(b[0].selling_price.toString()); }
    }
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isTekstil = selectedBatch?.products?.categories?.name_uz?.toLowerCase().includes('tekstil');

  const calculateItemQty = () => {
    const l = Number(sellLength || 0); const c = Number(sellCount || 1); const w = Number(selectedBatch?.width_m || 1);
    return isTekstil ? (l * w) : (l * c);
  };

  const addToCart = () => {
    const qtyToSell = calculateItemQty();
    if (!clientId) return toast.error("Iltimos, mijozni tanlang!");
    if (!selectedBatchId || !sellLength || !sellPrice) return toast.error("Barcha maydonlarni to'ldiring");
    if (selectedBatch.remaining_quantity < qtyToSell) return toast.error("Omborda yetarli emas!");

    setCart([...cart, { id: Math.random().toString(), batch_id: selectedBatch.id, product_id: selectedBatch.product_id, product_name: searchTerm, length: Number(sellLength), count: Number(sellCount), width: Number(selectedBatch.width_m || 0), total_qty: qtyToSell, price: Number(sellPrice), total_price: qtyToSell * Number(sellPrice), purchase_price: selectedBatch.purchase_price, isTekstil }]);
    toast.success("Savatga qo'shildi");
    setSelectedProdId(''); setSelectedBatchId(''); setSellLength(''); setSellCount('1'); setSellPrice(''); setSearchTerm(''); setBatches([]);
  };

  const totalCartSum = cart.reduce((sum, item) => sum + item.total_price, 0);
  const debtAmount = totalCartSum - Number(paidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error("Savat bo'sh!");
    setLoading(true);
    try {
      const { error } = await supabase.rpc('process_sale_secure', { p_client_id: clientId, p_items: cart, p_total_paid: Number(paidAmount || 0), p_user_name: profile?.full_name || 'Admin', p_debt_amount: debtAmount });
      if (error) throw error;

      setReceiptData({ clientName: clients.find(c => c.id === clientId)?.full_name || 'Mijoz', items: [...cart], total: totalCartSum, paid: Number(paidAmount || 0), debt: debtAmount, date: new Date().toLocaleString() });
      setShowSuccess(true);
      onSuccess();
      setCart([]);
      toast.success("Sotuv bajarildi!");
    } catch (err: any) { toast.error("Xatolik: " + err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-2xl p-6 md:p-8 space-y-6 my-auto max-h-[95vh] no-scrollbar overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase flex items-center gap-2 italic"><ShoppingCart className="text-primary" size={20} /> {t('new_sale')}</h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <div className="space-y-4">
           {/* Form Content... (Eski UI qismlari o'z joyida qolsin) */}
           <select className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold uppercase text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="" className="bg-black">Mijozni tanlang...</option>
              {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
           </select>

           <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <select className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-black uppercase outline-none" value={selectedCatId} onChange={e => { setSelectedCatId(e.target.value); setSelectedProdId(''); }}>
                    <option value="" className="bg-black">Kategoriya...</option>
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
                 </select>
                 <div onClick={() => selectedCatId && setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white flex justify-between items-center cursor-pointer text-[11px] font-black uppercase"><span className="truncate">{selectedProdId ? searchTerm : "Mahsulot..."}</span><Search size={14} /></div>
              </div>
              
              {/* Batches & Inputs logic here (previous versions logic) */}
              <div className="grid grid-cols-2 gap-3">
                 <input type="number" placeholder="Uzunlik (m)" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" value={sellLength} onChange={e => setSellLength(e.target.value)} />
                 <input type="number" placeholder="Narx ($)" className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-black outline-none" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
              </div>
              <button type="button" onClick={addToCart} className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest">+ Savatga qo'shish</button>
           </div>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
           <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-gray-500 uppercase">Jami Bill:</span>
              <span className="text-3xl font-black text-white italic">{convert(totalCartSum)}</span>
           </div>
           <input type="number" className="w-full px-5 py-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-emerald-500 text-2xl font-black outline-none text-center" placeholder="To'langan summa..." value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
           <button disabled={loading || cart.length === 0} onClick={handleSubmit} className="w-full py-5 bg-primary text-black font-black rounded-2xl uppercase text-xs tracking-widest flex justify-center items-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} SOTUVNI YAKUNLASH
           </button>
        </div>

        {/* PRINT AREA (Hidden) */}
        <div style={{ display: 'none' }}><Receipt ref={receiptRef} storeInfo={storeSettings} {...receiptData} /></div>

        {/* SUCCESS MODAL */}
        <AnimatePresence>
          {showSuccess && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-[#0c0c0e] border border-white/10 p-12 rounded-[3.5rem] text-center space-y-8 max-w-sm w-full shadow-2xl">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce"><CheckCircle2 size={56} strokeWidth={3} /></div>
                <h3 className="text-2xl font-black text-white uppercase italic">Sotuv bajarildi!</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={handlePrint} className="w-full py-5 bg-primary text-black font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest"><Printer size={20} /> Chekni chiqarish</button>
                  <button onClick={() => { setShowSuccess(false); onClose(); }} className="w-full py-5 bg-white/5 text-gray-400 font-black rounded-2xl uppercase text-xs tracking-widest hover:text-white transition-all">Yopish</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}