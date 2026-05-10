import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShoppingCart, Loader2, CheckCircle2, 
  Search, Trash2, Plus, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '../ui/Receipt';
import toast from 'react-hot-toast';

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
  const [productStock, setProductStock] = useState<{ totalStock: number; suggestedPrice: number; isTekstil: boolean; firstBatch: any } | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form
  const [clientId, setClientId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sellLength, setSellLength] = useState('');
  const [sellCount, setSellCount] = useState('1');
  const [sellWidth, setSellWidth] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  // Initial data
  useEffect(() => {
    const fetchData = async () => {
      const [c, p, cl, sett] = await Promise.all([
        supabase.from('categories').select('*').order('name_uz'),
        supabase.from('products').select('*'),
        supabase.from('clients').select('*').order('full_name'),
        supabase.from('app_settings').select('*').single(),
      ]);
      if (c.data) setCategories(c.data);
      if (p.data) setAllProducts(p.data);
      if (cl.data) setClients(cl.data);
      if (sett.data) setStoreSettings(sett.data);
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  // Modal yopilganda cleanup
  useEffect(() => {
    if (!isOpen) {
      setCart([]);
      setClientId('');
      setSelectedCatId('');
      setSelectedProdId('');
      setSearchTerm('');
      setSellLength('');
      setSellCount('1');
      setSellWidth('');
      setSellPrice('');
      setPaidAmount('');
      setProductStock(null);
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!selectedCatId) return [];
    return allProducts.filter(p => 
      p.category_id === selectedCatId && 
      p.name_uz.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedCatId, searchTerm, allProducts]);

  const handleProductSelect = async (prod: any) => {
    setSelectedProdId(prod.id);
    setSearchTerm(prod.name_uz);
    setIsDropdownOpen(false);
    
    const cat = categories.find(c => c.id === prod.category_id);
    const isTek = cat?.name_uz?.toLowerCase().includes('tekstil');
    
    // Eng eski partiyani topish (FIFO uchun preview)
    const { data: batches } = await supabase
      .from('batches')
      .select('*')
      .eq('product_id', prod.id)
      .gt('remaining_quantity', 0)
      .order('created_at', { ascending: true });
    
    if (batches && batches.length > 0) {
      const totalStock = batches.reduce((sum, b) => sum + Number(b.remaining_quantity), 0);
      const firstBatch = batches[0];
      setProductStock({
        totalStock,
        suggestedPrice: Number(firstBatch.selling_price) || 0,
        isTekstil: !!isTek,
        firstBatch,
      });
      setSellPrice(String(firstBatch.selling_price || ''));
      if (isTek && firstBatch.width_m) {
        setSellWidth(String(firstBatch.width_m));
      }
    } else {
      setProductStock({ totalStock: 0, suggestedPrice: 0, isTekstil: !!isTek, firstBatch: null });
      toast.error("Bu mahsulot omborda yo'q!");
    }
  };

  const calculateQty = (): number => {
    if (!productStock) return 0;
    const l = Number(sellLength || 0);
    if (productStock.isTekstil) {
      const w = Number(sellWidth || productStock.firstBatch?.width_m || 1);
      return l * w;
    }
    const c = Number(sellCount || 1);
    return l * c;
  };

  const addToCart = () => {
    const qtyToSell = calculateQty();
    
    if (!clientId) return toast.error("Mijozni tanlang!");
    if (!selectedProdId) return toast.error("Mahsulotni tanlang!");
    if (qtyToSell <= 0) return toast.error("Miqdor noto'g'ri!");
    if (!sellPrice || Number(sellPrice) <= 0) return toast.error("Narxni kiriting!");
    if (!productStock || productStock.totalStock < qtyToSell) {
      return toast.error(`Omborda yetarli emas! (${productStock?.totalStock || 0} bor)`);
    }
    
    setCart([...cart, {
      id: crypto.randomUUID(),
      product_id: selectedProdId,
      product_name: searchTerm,
      total_qty: qtyToSell,
      price: Number(sellPrice),
      total_price: qtyToSell * Number(sellPrice),
      isTekstil: productStock.isTekstil,
      details: productStock.isTekstil 
        ? `${sellWidth}m × ${sellLength}m` 
        : `${sellLength}m × ${sellCount}ta`,
    }]);
    
    toast.success("Savatga qo'shildi");
    setSelectedProdId('');
    setSearchTerm('');
    setSellLength('');
    setSellCount('1');
    setSellWidth('');
    setSellPrice('');
    setProductStock(null);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalCartSum = cart.reduce((sum, item) => sum + item.total_price, 0);
  const debtAmount = totalCartSum - Number(paidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error("Savat bo'sh!");
    if (!clientId) return toast.error("Mijoz tanlanmagan!");
    
    setLoading(true);
    try {
      // Cart items'ni RPC formatiga moslashtirish
      const items = cart.map(item => ({
        product_id: item.product_id,
        total_qty: item.total_qty,
        price: item.price,
        product_name: item.product_name,
      }));

      const { error } = await supabase.rpc('process_sale_secure_v2', {
        p_client_id: clientId,
        p_items: items,
        p_total_paid: Number(paidAmount || 0),
        p_user_name: profile?.full_name || 'Admin',
        p_debt_amount: debtAmount,
      });

      if (error) throw error;

      setReceiptData({
        clientName: clients.find(c => c.id === clientId)?.full_name || 'Mijoz',
        items: [...cart],
        total: totalCartSum,
        paid: Number(paidAmount || 0),
        debt: debtAmount,
        date: new Date().toLocaleString(),
      });
      setShowSuccess(true);
      onSuccess();
      setCart([]);
      toast.success("Sotuv bajarildi!");
    } catch (err: any) { 
      toast.error("Xatolik: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-sm font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/5 rounded-4xl shadow-2xl p-6 md:p-8 space-y-6 my-auto max-h-[95vh] no-scrollbar overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase flex items-center gap-2 italic">
            <ShoppingCart className="text-primary" size={20} /> {t('new_sale')}
          </h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white">
            <X size={20}/>
          </button>
        </div>

        {/* Mijoz */}
        <select 
          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold uppercase text-sm" 
          value={clientId} 
          onChange={e => setClientId(e.target.value)}
        >
          <option value="" className="bg-black">Mijozni tanlang...</option>
          {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.full_name}</option>)}
        </select>

        {/* Mahsulot tanlash */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <select 
              className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-black uppercase outline-none" 
              value={selectedCatId} 
              onChange={e => { setSelectedCatId(e.target.value); setSelectedProdId(''); setProductStock(null); }}
            >
              <option value="" className="bg-black">Kategoriya...</option>
              {categories.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>)}
            </select>
            <div 
              onClick={() => selectedCatId && setIsDropdownOpen(!isDropdownOpen)} 
              className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white flex justify-between items-center cursor-pointer text-[11px] font-black uppercase relative"
            >
              <span className="truncate">{selectedProdId ? searchTerm : "Mahsulot..."}</span>
              <Search size={14} />
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-xl z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={(e) => { e.stopPropagation(); handleProductSelect(p); }}
                      className="px-4 py-3 hover:bg-primary/10 text-xs text-white font-black border-b border-white/5"
                    >
                      {p.name_uz}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stock info */}
          {productStock && (
            <div className="text-[10px] text-primary font-black uppercase tracking-widest">
              Omborda: {productStock.totalStock.toFixed(2)} {productStock.isTekstil ? 'm²' : 'm'}
            </div>
          )}

          {/* O'lchovlar */}
          {productStock && productStock.isTekstil && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="number" 
                step="0.01"
                placeholder="Eni (m)" 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
                value={sellWidth} 
                onChange={e => setSellWidth(e.target.value)} 
              />
              <input 
                type="number" 
                step="0.01"
                placeholder="Bo'yi (m)" 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
                value={sellLength} 
                onChange={e => setSellLength(e.target.value)} 
              />
            </div>
          )}
          
          {productStock && !productStock.isTekstil && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="number" 
                step="0.01"
                placeholder="Uzunlik (m)" 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
                value={sellLength} 
                onChange={e => setSellLength(e.target.value)} 
              />
              <input 
                type="number" 
                placeholder="Dona" 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
                value={sellCount} 
                onChange={e => setSellCount(e.target.value)} 
              />
            </div>
          )}

          {productStock && (
            <input 
              type="number" 
              step="0.01"
              placeholder="Narx ($)" 
              className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-black outline-none" 
              value={sellPrice} 
              onChange={e => setSellPrice(e.target.value)} 
            />
          )}

          {productStock && calculateQty() > 0 && (
            <div className="text-center text-[10px] text-gray-500 font-black uppercase">
              Jami: {calculateQty().toFixed(2)} {productStock.isTekstil ? 'm²' : 'm'} × {sellPrice}$ = {(calculateQty() * Number(sellPrice || 0)).toLocaleString()}$
            </div>
          )}

          <button 
            type="button" 
            onClick={addToCart} 
            disabled={!productStock || calculateQty() <= 0}
            className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-30"
          >
            <Plus size={14} className="inline mr-1" /> Savatga qo'shish
          </button>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white/3 border border-white/5 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs font-black text-white">{item.product_name}</p>
                  <p className="text-[9px] text-gray-500">{item.details} = {item.total_qty.toFixed(2)} {item.isTekstil ? 'm²' : 'm'}</p>
                </div>
                <div className="text-sm font-black text-primary">{item.total_price.toLocaleString()}$</div>
                <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-500 hover:text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total + Submit */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black text-gray-500 uppercase">Jami:</span>
            <span className="text-3xl font-black text-white italic">{convert(totalCartSum)}</span>
          </div>
          <input 
            type="number" 
            step="0.01"
            className="w-full px-5 py-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-emerald-500 text-2xl font-black outline-none text-center" 
            placeholder="To'langan summa..." 
            value={paidAmount} 
            onChange={e => setPaidAmount(e.target.value)} 
          />
          {debtAmount > 0 && (
            <div className="text-center text-rose-500 text-xs font-black uppercase">
              Qarz: {debtAmount.toLocaleString()}$
            </div>
          )}
          <button 
            disabled={loading || cart.length === 0} 
            onClick={handleSubmit} 
            className="w-full py-5 bg-primary text-black font-black rounded-2xl uppercase text-xs tracking-widest flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} 
            SOTUVNI YAKUNLASH
          </button>
        </div>

        {/* Receipt (hidden) */}
        <div style={{ display: 'none' }}>
          {receiptData && <Receipt ref={receiptRef} storeInfo={storeSettings} {...receiptData} />}
        </div>

        {/* Success */}
        <AnimatePresence>
          {showSuccess && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-[#0c0c0e] border border-white/10 p-12 rounded-[3.5rem] text-center space-y-8 max-w-sm w-full">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                  <CheckCircle2 size={56} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic">Sotuv bajarildi!</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={handlePrint} className="w-full py-5 bg-primary text-black font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
                    <Printer size={20} /> Chekni chiqarish
                  </button>
                  <button onClick={() => { setShowSuccess(false); onClose(); }} className="w-full py-5 bg-white/5 text-gray-400 font-black rounded-2xl uppercase text-xs tracking-widest hover:text-white">
                    Yopish
                  </button>
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