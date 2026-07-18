import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Plus, GitBranch, Building2, User, CalendarClock,
  MoreVertical, X, Inbox
} from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import DealModal from '../components/modals/DealModal';
import { DEAL_STAGES, STAGE_MAP } from '../constants/dealStages';
import type { DealStage } from '../types';

export default function Deals() {
  const { t, i18n } = useTranslation();
  const { convert } = useCurrencyStore();

  const [deals, setDeals] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<Record<string, { count: number; total: number }>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [modalStage, setModalStage] = useState<DealStage>('new');

  // lost sababi modali
  const [lostTarget, setLostTarget] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');

  const fetchAll = useCallback(async () => {
    // owner_id profiles bilan FK orqali bog'lanmagan (auth.users'ga ishora qiladi),
    // shuning uchun profiles'ni alohida yuklab id→ism xaritasini quramiz
    const [{ data: dealsData }, { data: funnelData }, { data: profilesData }] = await Promise.all([
      supabase
        .from('deals')
        .select('*, clients(full_name, kind), contacts(full_name, position)')
        .order('created_at', { ascending: false }),
      supabase.rpc('get_sales_funnel'),
      supabase.from('profiles').select('id, full_name'),
    ]);

    setOwnerNames(Object.fromEntries((profilesData || []).map((p: any) => [p.id, p.full_name])));
    setDeals(dealsData || []);
    const f: Record<string, { count: number; total: number }> = {};
    (funnelData || []).forEach((row: any) => {
      f[row.stage] = { count: Number(row.count), total: Number(row.total) };
    });
    setFunnel(f);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const dealsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    DEAL_STAGES.forEach(s => { map[s.id] = []; });
    deals.forEach(d => { (map[d.stage] ||= []).push(d); });
    return map;
  }, [deals]);

  // Header uchun: funnel RPC bo'lsa undan, aks holda ko'rinib turgan kartalardan
  const stageTotals = (stage: string) => {
    if (funnel[stage]) return funnel[stage];
    const list = dealsByStage[stage] || [];
    return { count: list.length, total: list.reduce((s, d) => s + Number(d.expected_amount || 0), 0) };
  };

  const applyMove = async (dealId: string, toStage: DealStage, reason?: string) => {
    const prev = deals;
    // optimistik: kartani darrov ko'chir
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, stage: toStage } : d));

    const { error } = await supabase.rpc('move_deal_stage', {
      p_deal_id: dealId,
      p_stage: toStage,
      p_lost_reason: reason ?? null,
    });

    if (error) {
      setDeals(prev); // orqaga qaytar
      toast.error("Xatolik: " + error.message);
      return;
    }
    toast.success(t('deal_moved'));
    fetchAll(); // funnel summalarini yangila
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const toStage = String(over.id) as DealStage;
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === toStage) return;

    if (toStage === 'lost') {
      setLostReason('');
      setLostTarget(dealId);
      return;
    }
    applyMove(dealId, toStage);
  };

  const confirmLost = () => {
    if (!lostReason.trim()) return toast.error(t('lost_reason_required'));
    const id = lostTarget!;
    setLostTarget(null);
    applyMove(id, 'lost', lostReason.trim());
  };

  const openNew = (stage: DealStage) => { setEditingDeal(null); setModalStage(stage); setModalOpen(true); };
  const openEdit = (deal: any) => { setEditingDeal(deal); setModalOpen(true); };

  // Mobil menyudan bosqich tanlash
  const pickStage = (dealId: string, toStage: DealStage) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === toStage) return;
    if (toStage === 'lost') { setLostReason(''); setLostTarget(dealId); return; }
    applyMove(dealId, toStage);
  };

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  if (loading) {
    return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <GitBranch size={22} className="text-primary" /> {t('deals_funnel')}
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wide mt-1">{t('deals_subtitle')}</p>
        </div>
        <button onClick={() => openNew('new')} className="px-6 py-3 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
          <Plus size={18} strokeWidth={3} /> {t('new_deal')}
        </button>
      </div>

      {/* KANBAN */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar snap-x">
          {DEAL_STAGES.map(stage => (
            <Column
              key={stage.id}
              stage={stage.id}
              totals={stageTotals(stage.id)}
              deals={dealsByStage[stage.id] || []}
              convert={convert}
              language={i18n.language}
              ownerNames={ownerNames}
              onAdd={() => openNew(stage.id)}
              onEdit={openEdit}
              onPickStage={pickStage}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <Card deal={activeDeal} convert={convert} language={i18n.language} ownerNames={ownerNames} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* DEAL MODAL */}
      <DealModal
        isOpen={modalOpen}
        initialData={editingDeal}
        defaultStage={modalStage}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchAll}
      />

      {/* LOST SABABI MODAL */}
      <AnimatePresence>
        {lostTarget && (
          <div className="fixed inset-0 z-1100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setLostTarget(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-96 bg-[#0c0c0e] border border-white/5 rounded-[2rem] p-7 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-rose-500 uppercase tracking-tighter">{t('lost_reason')}</h3>
                <button onClick={() => setLostTarget(null)} className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-white"><X size={18} /></button>
              </div>
              <textarea
                autoFocus
                rows={3}
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                placeholder={t('lost_reason')}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-xs font-bold outline-none focus:border-rose-500/40 resize-none"
              />
              <button onClick={confirmLost} className="w-full py-3.5 bg-rose-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                {t('stage_lost')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Column({ stage, totals, deals, convert, language, ownerNames, onAdd, onEdit, onPickStage }: any) {
  const { t } = useTranslation();
  const cfg = STAGE_MAP[stage as DealStage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="shrink-0 w-72 snap-start flex flex-col">
      {/* Ustun sarlavhasi */}
      <div className={cn("relative flex items-center justify-between gap-2 pl-4 pr-2 py-3 bg-[#0c0c0e] border border-white/5 rounded-2xl mb-2 overflow-hidden")}>
        <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", cfg.bar)} />
        <div className="min-w-0">
          <p className={cn("text-[10px] font-black uppercase tracking-wide truncate", cfg.text)}>{t(cfg.labelKey)}</p>
          <p className="text-[13px] font-black text-white tracking-tighter mt-0.5">
            <span className="text-gray-500 font-bold">{totals.count} · </span>{convert(totals.total)}
          </p>
        </div>
        <button onClick={onAdd} className="p-1.5 bg-white/5 rounded-lg text-gray-500 hover:text-primary transition-all shrink-0"><Plus size={15} strokeWidth={3} /></button>
      </div>

      {/* Kartalar zonasi (droppable) */}
      <div ref={setNodeRef} className={cn("flex-1 min-h-32 space-y-2 p-1.5 rounded-2xl transition-colors", isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-transparent")}>
        {deals.map((d: any) => (
          <DraggableCard key={d.id} deal={d} convert={convert} language={language} ownerNames={ownerNames} onEdit={() => onEdit(d)} onPickStage={onPickStage} />
        ))}
        {deals.length === 0 && (
          <div className="py-8 text-center text-gray-700 opacity-40">
            <Inbox size={18} className="mx-auto mb-1.5" />
            <p className="text-[9px] font-black uppercase tracking-widest">{t('no_deals')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ deal, convert, language, ownerNames, onEdit, onPickStage }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <Card deal={deal} convert={convert} language={language} ownerNames={ownerNames} onEdit={onEdit} onPickStage={onPickStage} dragHandle={{ ...listeners, ...attributes }} />
    </div>
  );
}

function Card({ deal, convert, language, ownerNames, onEdit, onPickStage, dragHandle, overlay }: any) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCompany = deal.clients?.kind === 'company';
  const overdue = deal.expected_close_date && new Date(deal.expected_close_date) < new Date() && deal.stage !== 'won' && deal.stage !== 'lost';

  return (
    <div className={cn(
      "relative group bg-[#121214] border border-white/5 rounded-xl p-2.5 select-none",
      overlay ? "shadow-2xl rotate-2 cursor-grabbing" : "cursor-grab hover:border-white/10"
    )}>
      {/* Sudrash zonasi + tahrirlash uchun bosish */}
      <div {...(dragHandle || {})} onClick={() => !overlay && onEdit?.()}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-black text-white leading-tight truncate flex-1">{deal.title}</p>
          <p className="text-[13px] font-black text-primary tracking-tighter shrink-0">{convert(deal.expected_amount || 0)}</p>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-bold min-w-0">
          {isCompany ? <Building2 size={11} className="shrink-0" /> : <User size={11} className="shrink-0" />}
          <span className="truncate">
            {deal.clients?.full_name || '—'}
            {deal.contacts?.full_name ? ` · ${deal.contacts.full_name}` : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
          <span className="text-[9px] font-black text-gray-600 truncate">{(deal.owner_id && ownerNames?.[deal.owner_id]) || '—'}</span>
          <div className="flex items-center gap-2 shrink-0">
            {deal.expected_close_date && (
              <span className={cn("flex items-center gap-1 text-[9px] font-bold", overdue ? "text-rose-500" : "text-gray-600")}>
                <CalendarClock size={10} /> {new Date(deal.expected_close_date).toLocaleDateString(language)}
              </span>
            )}
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{deal.probability ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Mobil / alternativ: bosqich menyusi */}
      {!overlay && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-gray-600 opacity-0 group-hover:opacity-100 lg:opacity-0 max-lg:opacity-100 transition-opacity"
        >
          <MoreVertical size={13} />
        </button>
      )}
      {menuOpen && !overlay && (
        <>
          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="absolute right-2 top-8 z-30 w-44 bg-[#1a1a1d] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
            <p className="px-3 py-1.5 text-[8px] font-black text-gray-600 uppercase tracking-widest">{t('change_stage')}</p>
            {DEAL_STAGES.filter(s => s.id !== deal.stage).map(s => (
              <button
                key={s.id}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPickStage(deal.id, s.id); }}
                className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-wide text-gray-300 hover:bg-white/5 flex items-center gap-2"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", STAGE_MAP[s.id].bar)} /> {t(s.labelKey)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
