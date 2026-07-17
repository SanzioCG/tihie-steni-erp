import type { DealStage } from '../types';

// Bitrix uslubidagi voronka bosqichlari — tartib va ranglar shu yerdan
// Rang palitrasi loyihaning mavjud aksentlariga mos (fon/primary o'zgarmaydi)
export interface StageConfig {
  id: DealStage;
  labelKey: string;
  // chap chiziq + badge ranglari (Tailwind klass bo'laklari)
  bar: string;      // chap 3px rangli chiziq
  text: string;     // sarlavha/summa matni
  dot: string;      // kichik nuqta/badge foni
}

export const DEAL_STAGES: StageConfig[] = [
  { id: 'new',          labelKey: 'stage_new',          bar: 'bg-gray-500',    text: 'text-gray-300',    dot: 'bg-gray-500/15 text-gray-300' },
  { id: 'contacted',    labelKey: 'stage_contacted',    bar: 'bg-blue-500',    text: 'text-blue-400',    dot: 'bg-blue-500/15 text-blue-400' },
  { id: 'offer_sent',   labelKey: 'stage_offer_sent',   bar: 'bg-violet-500',  text: 'text-violet-400',  dot: 'bg-violet-500/15 text-violet-400' },
  { id: 'negotiation',  labelKey: 'stage_negotiation',  bar: 'bg-amber-500',   text: 'text-amber-400',   dot: 'bg-amber-500/15 text-amber-400' },
  { id: 'won',          labelKey: 'stage_won',          bar: 'bg-primary',     text: 'text-primary',     dot: 'bg-primary/15 text-primary' },
  { id: 'lost',         labelKey: 'stage_lost',         bar: 'bg-rose-500',    text: 'text-rose-500',    dot: 'bg-rose-500/15 text-rose-500' },
];

export const STAGE_MAP: Record<DealStage, StageConfig> =
  Object.fromEntries(DEAL_STAGES.map(s => [s.id, s])) as Record<DealStage, StageConfig>;

// Bosqichga qarab probability (backend ham shu qiymatlarni yozadi — mos ushlab turamiz)
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  new: 10, contacted: 25, offer_sent: 50, negotiation: 75, won: 100, lost: 0,
};
