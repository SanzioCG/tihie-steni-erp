import { Plus, Search } from 'lucide-react';
import { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ProductPickerProps {
  categories: any[];
  allProducts: any[];
  productStock: any;
  
  selectedCatId: string;
  selectedProdId: string;
  searchTerm: string;
  isDropdownOpen: boolean;
  sellLength: string;
  sellCount: string;
  sellWidth: string;
  sellPrice: string;
  
  onCatChange: (id: string) => void;
  onProductSelect: (prod: any) => void;
  onSearchTermChange: (val: string) => void;
  onDropdownToggle: () => void;
  onLengthChange: (val: string) => void;
  onCountChange: (val: string) => void;
  onWidthChange: (val: string) => void;
  onPriceChange: (val: string) => void;
  
  calculateQty: () => number;
  onAddToCart: () => void;
}

export default function ProductPicker(p: ProductPickerProps) {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!p.selectedCatId) return [];
    return p.allProducts.filter(prod =>
      prod.category_id === p.selectedCatId &&
      prod.name_uz.toLowerCase().includes(p.searchTerm.toLowerCase())
    );
  }, [p.selectedCatId, p.searchTerm, p.allProducts]);

  // Dropdown tashqarisiga bosilganda yopish
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (p.isDropdownOpen && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        p.onDropdownToggle();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [p.isDropdownOpen, p.onDropdownToggle]);

  return (
    <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select 
          className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-black uppercase outline-none" 
          value={p.selectedCatId} 
          onChange={e => p.onCatChange(e.target.value)}
        >
          <option value="" className="bg-black">{t('category')}...</option>
          {p.categories.map(c => (
            <option key={c.id} value={c.id} className="bg-black">{c.name_uz}</option>
          ))}
        </select>
        
        <div className="relative" ref={pickerRef}>
          <input
            type="text"
            value={p.searchTerm}
            disabled={!p.selectedCatId}
            onChange={e => {
              p.onSearchTermChange(e.target.value);
              if (!p.isDropdownOpen) p.onDropdownToggle();
            }}
            onFocus={() => { if (p.selectedCatId && !p.isDropdownOpen) p.onDropdownToggle(); }}
            placeholder={t('search_product')}
            className="w-full px-4 py-3 pr-9 bg-white/5 border border-white/5 rounded-xl text-white text-[11px] font-black uppercase outline-none placeholder:text-gray-600 disabled:opacity-30"
          />
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          {p.isDropdownOpen && p.selectedCatId && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-xl z-50 max-h-48 overflow-y-auto">
              {filteredProducts.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => p.onProductSelect(prod)}
                  className="px-4 py-3 hover:bg-primary/10 text-xs text-white font-black border-b border-white/5 cursor-pointer uppercase"
                >
                  {prod.name_uz}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-4 py-3 text-[11px] text-gray-600 font-black uppercase">{t('not_found', 'Topilmadi')}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {p.productStock && (
        <div className="text-[10px] text-primary font-black uppercase tracking-widest">
          {t('in_stock')}: {p.productStock.totalStock.toFixed(2)} {p.productStock.isTekstil ? 'm²' : 'm'}
        </div>
      )}

      {p.productStock && p.productStock.isTekstil && (
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" step="0.01" placeholder={t('width_m')} 
            className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
            value={p.sellWidth} 
            onChange={e => p.onWidthChange(e.target.value)} 
          />
          <input 
            type="number" step="0.01" placeholder={t('length_m')} 
            className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
            value={p.sellLength} 
            onChange={e => p.onLengthChange(e.target.value)} 
          />
        </div>
      )}
      
      {p.productStock && !p.productStock.isTekstil && (
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" step="0.01" placeholder={t('length_m')} 
            className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
            value={p.sellLength} 
            onChange={e => p.onLengthChange(e.target.value)} 
          />
          <input 
            type="number" placeholder={t('count_pcs')} 
            className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none" 
            value={p.sellCount} 
            onChange={e => p.onCountChange(e.target.value)} 
          />
        </div>
      )}

      {p.productStock && (
        <input 
          type="number" step="0.01" placeholder={t('price_label')} 
          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-primary font-black outline-none" 
          value={p.sellPrice} 
          onChange={e => p.onPriceChange(e.target.value)} 
        />
      )}

      {p.productStock && p.calculateQty() > 0 && (
        <div className="text-center text-[10px] text-gray-500 font-black uppercase">
          {t('total')}: {p.calculateQty().toFixed(2)} {p.productStock.isTekstil ? 'm²' : 'm'} × {p.sellPrice}$ = {(p.calculateQty() * Number(p.sellPrice || 0)).toLocaleString()}$
        </div>
      )}

      <button 
        type="button" 
        onClick={p.onAddToCart} 
        disabled={!p.productStock || p.calculateQty() <= 0}
        className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-30"
      >
        <Plus size={14} className="inline mr-1" /> {t('add_to_cart')}
      </button>
    </div>
  );
}