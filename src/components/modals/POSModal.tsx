import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, CheckCircle2, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '../ui/Receipt';
import toast from 'react-hot-toast';
import { sendNotification } from '../../lib/pushNotifications';

import ClientSelector from './pos/ClientSelector';
import ProductPicker from './pos/ProductPicker';
import Cart from './pos/Cart';
import PaymentSection from './pos/PaymentSection';

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
  const [productStock, setProductStock] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const handleProductSelect = async (prod: any) => {
    setSelectedProdId(prod.id);
    setSearchTerm(prod.name_uz);
    setIsDropdownOpen(false);
    
    const cat = categories.find(c => c.id === prod.category_id);
    const isTek = cat?.name_uz?.toLowerCase().includes('tekstil');
    
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
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      sendNotification(
        'Yangi sotuv',
        `${profile?.full_name || 'Sotuvchi'}: ${convert(totalCartSum)}`,
        { type: 'sale', amount: totalCartSum }
      );
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

        <ClientSelector 
          clients={clients} 
          value={clientId} 
          onChange={setClientId} 
        />

        <ProductPicker 
          categories={categories}
          allProducts={allProducts}
          productStock={productStock}
          selectedCatId={selectedCatId}
          selectedProdId={selectedProdId}
          searchTerm={searchTerm}
          isDropdownOpen={isDropdownOpen}
          sellLength={sellLength}
          sellCount={sellCount}
          sellWidth={sellWidth}
          sellPrice={sellPrice}
          onCatChange={(id) => { setSelectedCatId(id); setSelectedProdId(''); setProductStock(null); }}
          onProductSelect={handleProductSelect}
          onSearchTermChange={setSearchTerm}
          onDropdownToggle={() => setIsDropdownOpen(!isDropdownOpen)}
          onLengthChange={setSellLength}
          onCountChange={setSellCount}
          onWidthChange={setSellWidth}
          onPriceChange={setSellPrice}
          calculateQty={calculateQty}
          onAddToCart={addToCart}
        />

        <Cart items={cart} onRemove={removeFromCart} />

        <PaymentSection 
          totalCartSum={totalCartSum}
          paidAmount={paidAmount}
          onPaidChange={setPaidAmount}
          onSubmit={handleSubmit}
          loading={loading}
          cartLength={cart.length}
        />

        <div style={{ display: 'none' }}>
          {receiptData && <Receipt ref={receiptRef} storeInfo={storeSettings} {...receiptData} />}
        </div>

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