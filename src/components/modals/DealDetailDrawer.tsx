import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Plus, Trash2, Search, Building2, User, GitBranch,
  CalendarClock, UserCheck, AlertTriangle, Trophy, Package, CheckCircle2, Pencil,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { STAGE_MAP } from '../../constants/dealStages';
import { unitLabel } from '../../lib/units';
import type { DealDetail, DealStage } from '../../types';

interface Props {
  deal: any | null;                       // clients/contacts join bilan; null => yopiq
  ownerNames: Record<string, string>;
  onClose: () => void;
  onChanged: () => void;                  // voronka refetch (item o'zgargв yoki yutilganда)
  onEdit: () => void;                     // bitim maydonlarini tahrirlash (DealModal)
}

const WINNABLE: DealStage[] = ['new', 'contacted', 'offer_sent', 'negotiation'];

export default function DealDetailDrawer({ deal, ownerNames, onClose, onChanged, onEdit }: Props) {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();
  const { profile } = useAuthStore();

  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // mahsulot qo'shish
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [picked, setPicked] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  // yutish modali
  const [winOpen, setWinOpen] = useState(false);
  const [paid, setPaid] = useState('');
  const [winLoading, setWinLoading] = useState(false);

  const dealId = deal?.id;

  const loadDetail = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_deal_detail', { p_deal_id: dealId });
    if (!error && data) setDetail(data as DealDetail);
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    if (!dealId) return;
    loadDetail();
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []));
    // reset add-form
    setSearch(''); setPicked(null); setQty(''); setPrice(''); setDropdownOpen(false);
    setWinOpen(false); setPaid('');
  }, [dealId, loadDetail]);

  // dropdown tashqarisiga bosilsa yopish
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickRef.current && !pickRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      `${p.name_uz} ${p.name_ru} ${p.name_en} ${p.sku}`.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, search]);

  // Birlik to'g'ridan-to'g'ri product.unit'dan (taxmin yo'q)
  const unitOf = (productId?: string): string =>
    unitLabel(products.find(x => x.id === productId)?.unit, t);

  const selectProduct = async (p: any) => {
    setPicked(p);
    setSearch(p.name_uz);
    setDropdownOpen(false);
    // taxminiy sotuv narxini oxirgi partiyadan olib qo'yamiz
    const { data } = await supabase
      .from('batches')
      .select('selling_price')
      .eq('product_id', p.id)
      .gt('remaining_quantity', 0)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data?.selling_price) setPrice(String(data.selling_price));
  };

  const addItem = async () => {
    if (!picked) return toast.error(t('add_product_to_deal'));
    const q = Number(qty);
    const pr = Number(price);
    if (!(q > 0)) return toast.error(t('fill_fields'));
    if (!(pr > 0)) return toast.error(t('fill_fields'));

    setAdding(true);
    const { error } = await supabase.from('deal_items').insert({
      deal_id: dealId,
      product_id: picked.id,
      product_name: picked.name_uz,
      quantity: q,
      unit_price: pr,
    });
    setAdding(false);
    if (error) return toast.error('Xatolik: ' + error.message);

    setPicked(null); setSearch(''); setQty(''); setPrice('');
    await loadDetail();
    onChanged();               // expected_amount trigger yangiladi → voronka summasi
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('deal_items').delete().eq('id', id);
    if (error) return toast.error('Xatolik: ' + error.message);
    await loadDetail();
    onChanged();
  };

  const revenue = detail?.revenue ?? 0;
  const hasItems = (detail?.items?.length ?? 0) > 0;
  const canWin = !!deal && WINNABLE.includes(deal.stage) && hasItems;

  const openWin = () => { setPaid(String(revenue)); setWinOpen(true); };
  const debt = Math.max(0, revenue - Number(paid || 0));

  const confirmWin = async () => {
    setWinLoading(true);
    const { error } = await supabase.rpc('win_deal_to_sale', {
      p_deal_id: dealId,
      p_total_paid: Number(paid || 0),
      p_debt_amount: debt,
      p_user_name: profile?.full_name || 'Admin',
    });
    setWinLoading(false);
    if (error) return toast.error('Xatolik: ' + error.message);
    toast.success(t('deal_won_sale_created'));
    setWinOpen(false);
    onChanged();
    onClose();
  };

  if (!deal) return null;

  const cfg = STAGE_MAP[deal.stage as DealStage];
  const isCompany = deal.clients?.kind === 'company';
  const marginPositive = (detail?.est_margin ?? 0) >= 0;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex justify-end font-sans">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
        className="relative w-full max-w-md bg-[#0a0a0b] border-l border-white/5 h-full overflow-y-auto no-scrollbar shadow-2xl flex flex-col"
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <GitBranch size={16} className="text-primary shrink-0" />
                <span className={cn("text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md", cfg.dot)}>
                  {t(cfg.labelKey)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight truncate">{deal.title}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400 font-medium min-w-0">
                {isCompany ? <Building2 size={12} className="shrink-0" /> : <User size={12} className="shrink-0" />}
                <span className="truncate">
                  {deal.clients?.full_name || '—'}
                  {deal.contacts?.full_name ? ` · ${deal.contacts.full_name}${deal.contacts?.position ? ` · ${deal.contacts.position}` : ''}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 font-normal">
                <span className="flex items-center gap-1"><UserCheck size={11} /> {(deal.owner_id && ownerNames?.[deal.owner_id]) || '—'}</span>
                {deal.expected_close_date && (
                  <span className="flex items-center gap-1"><CalendarClock size={11} /> {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={onEdit} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-primary transition-all"><Pencil size={15} /></button>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"><X size={18} /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* MAHSULOTLAR */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package size={13} /> {t('deal_products')}
            </p>

            {loading ? (
              <div className="py-10 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={26} /></div>
            ) : (
              <div className="space-y-1.5">
                {(detail?.items || []).map(item => {
                  const short = item.in_stock < item.quantity;
                  const unit = unitOf(item.product_id);
                  return (
                    <div key={item.id} className="group flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-white truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-normal">
                          <span>{item.quantity} {unit} × {convert(item.unit_price)}</span>
                          <span className={cn("flex items-center gap-1", short ? "text-rose-500 font-medium" : "text-gray-500")}>
                            {short && <AlertTriangle size={10} />}
                            {t('in_stock_label')}: {Number(item.in_stock).toFixed(2)} {unit}
                          </span>
                        </div>
                        {short && (
                          <p className="text-[9px] text-rose-500 font-medium uppercase tracking-wide mt-0.5">{t('not_enough_stock')}</p>
                        )}
                      </div>
                      <span className="text-[13px] font-bold text-primary tracking-tighter shrink-0">{convert(item.line_total)}</span>
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-600 hover:text-rose-500 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {!hasItems && (
                  <div className="py-6 text-center text-gray-600">
                    <Package size={22} className="mx-auto mb-1.5 opacity-40" />
                    <p className="text-[10px] font-medium uppercase tracking-wide">—</p>
                  </div>
                )}
              </div>
            )}

            {/* Mahsulot qo'shish */}
            <div className="mt-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-2">
              <div className="relative" ref={pickRef}>
                <input
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setDropdownOpen(true);
                    if (picked) { setPicked(null); setPrice(''); }
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder={t('search_product')}
                  className="w-full px-3 py-2.5 pr-9 bg-white/5 border border-white/5 rounded-lg text-white text-[12px] font-medium outline-none focus:border-primary/30 placeholder:text-gray-600"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#121214] border border-white/10 rounded-lg z-20 max-h-48 overflow-y-auto no-scrollbar shadow-2xl">
                    {filtered.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className="px-3 py-2.5 hover:bg-primary/10 text-[12px] text-white font-medium cursor-pointer border-b border-white/5"
                      >
                        {p.name_uz}
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <div className="px-3 py-2.5 text-[11px] text-gray-600 font-medium">—</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)}
                  placeholder={picked ? `${t('quantity')} · ${unitOf(picked.id)}` : t('quantity')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/5 rounded-lg text-white text-[12px] font-medium outline-none focus:border-primary/30 placeholder:text-gray-600"
                />
                <input
                  type="number" step="any" min="0" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder={t('price_label')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/5 rounded-lg text-emerald-400 text-[12px] font-medium outline-none focus:border-primary/30 placeholder:text-gray-600"
                />
              </div>

              <button
                onClick={addItem}
                disabled={adding || !picked}
                className="w-full py-2.5 bg-white/5 hover:bg-primary hover:text-black text-gray-300 font-semibold rounded-lg uppercase text-[10px] tracking-wide flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              >
                {adding ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} strokeWidth={3} />} {t('add_product_to_deal')}
              </button>
            </div>
          </div>

          {/* MARJA */}
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{t('deal_revenue')}</span>
              <span className="text-[13px] font-semibold text-white">{convert(revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{t('deal_cost')}</span>
              <span className="text-[13px] font-semibold text-gray-300">~{convert(detail?.est_cost ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">{t('deal_margin')}</span>
              <span className={cn("text-base font-bold tracking-tighter", marginPositive ? "text-primary" : "text-rose-500")}>
                {convert(detail?.est_margin ?? 0)}
                <span className="text-[10px] font-medium ml-1 opacity-70">({(detail?.est_margin_pct ?? 0).toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* YUTISH TUGMASI */}
        {canWin && (
          <div className="sticky bottom-0 bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-white/5 p-4">
            <button
              onClick={openWin}
              className="w-full py-3.5 bg-primary text-black font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all uppercase text-[11px] tracking-wide flex items-center justify-center gap-2"
            >
              <Trophy size={16} strokeWidth={3} /> {t('win_to_sale')}
            </button>
          </div>
        )}

        {/* YUTISHNI TASDIQLASH MODALI */}
        <AnimatePresence>
          {winOpen && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setWinOpen(false)} />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-xs bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-2">
                    <Trophy size={24} />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">{t('confirm_win')}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-400 font-medium uppercase tracking-wide">{t('deal_revenue')}</span>
                    <span className="text-white font-semibold">{convert(revenue)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide ml-1">{t('paid_amount')}</label>
                    <input
                      type="number" step="any" min="0" autoFocus value={paid} onChange={e => setPaid(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-center font-bold text-lg outline-none focus:border-primary/40"
                    />
                  </div>
                  <div className="flex justify-between items-center px-1 text-[12px]">
                    <span className="text-gray-400 font-medium uppercase tracking-wide">{t('remaining_debt')}</span>
                    <span className={cn("font-bold", debt > 0 ? "text-rose-500" : "text-primary")}>{convert(debt)}</span>
                  </div>
                </div>

                <button
                  onClick={confirmWin}
                  disabled={winLoading}
                  className="w-full py-3.5 bg-primary text-black font-bold rounded-2xl uppercase text-[11px] tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {winLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} strokeWidth={3} />} {t('confirm_win')}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}
