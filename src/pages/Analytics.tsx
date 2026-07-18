import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Wallet, AlertTriangle, Package,
  Users, Loader2, Building2, User, Snowflake, Target,
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { cn } from '../lib/utils';

// Qarz yoshi bucket'lari — rang bosqichlari (yashil → qizil)
const BUCKETS = [
  { key: 'd0_30',   labelKey: 'aging_0_30',   text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { key: 'd31_60',  labelKey: 'aging_31_60',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20' },
  { key: 'd61_90',  labelKey: 'aging_61_90',  text: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  { key: 'd90_plus',labelKey: 'aging_90_plus',text: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
] as const;

const BUCKET_MAP = Object.fromEntries(BUCKETS.map(b => [b.key, b]));

const CLASS_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: 'text-primary',   bg: 'bg-primary/10',   border: 'border-primary/20' },
  B: { text: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/20' },
  C: { text: 'text-gray-400',  bg: 'bg-white/5',      border: 'border-white/10' },
};

export default function Analytics() {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();

  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [abc, setAbc] = useState<any>(null);
  const [dead, setDead] = useState<any>(null);

  const [deadDays, setDeadDays] = useState(60);
  const [deadLoading, setDeadLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [f, a, b, d] = await Promise.all([
        supabase.rpc('get_weighted_forecast'),
        supabase.rpc('get_debt_aging'),
        supabase.rpc('get_abc_analysis'),
        supabase.rpc('get_dead_stock', { p_days: 60 }),
      ]);
      if (f.data) setForecast(f.data);
      if (a.data) setAging(a.data);
      if (b.data) setAbc(b.data);
      if (d.data) setDead(d.data);
      setLoading(false);
    };
    load();
  }, []);

  const reloadDead = useCallback(async (days: number) => {
    setDeadDays(days);
    setDeadLoading(true);
    const { data } = await supabase.rpc('get_dead_stock', { p_days: days });
    if (data) setDead(data);
    setDeadLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  const abcTotal = (abc?.summary?.A_revenue || 0) + (abc?.summary?.B_revenue || 0) + (abc?.summary?.C_revenue || 0);
  const pct = (v: number) => abcTotal > 0 ? ((v / abcTotal) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500 font-sans pb-20">
      {/* HEADER */}
      <div className="px-2">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <BarChart3 size={22} className="text-primary" /> {t('analytics')}
        </h1>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{t('analytics_subtitle')}</p>
      </div>

      {/* ── BLOK 1: VAZNLI PROGNOZ ── */}
      <Section icon={Target} title={t('weighted_forecast')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI
            icon={TrendingUp}
            label={t('expected_revenue')}
            value={convert(forecast?.weighted_total || 0)}
            sub={`${forecast?.open_deals || 0} ${t('open_deals_count')}`}
            iconBg="bg-primary/10 text-primary" valueColor="text-primary"
          />
          <KPI
            icon={BarChart3}
            label={t('total_pipeline')}
            value={convert(forecast?.gross_total || 0)}
            iconBg="bg-white/5 text-gray-300" valueColor="text-gray-300"
          />
          <KPI
            icon={Wallet}
            label={t('expected_this_month')}
            value={convert(forecast?.expected_this_month || 0)}
            iconBg="bg-amber-500/10 text-amber-500" valueColor="text-amber-500"
          />
        </div>
        <Note>{t('weighted_forecast')} = Σ (deal × probability). {t('expected_revenue')}.</Note>
      </Section>

      {/* ── BLOK 2: QARZ YOSHI ── */}
      <Section icon={Wallet} title={t('debt_aging')}>
        <div className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <span className="text-[11px] font-medium text-rose-500 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle size={15} /> {t('at_risk_debt')}
          </span>
          <span className="text-2xl font-bold text-rose-500 tracking-tighter">{convert(aging?.at_risk || 0)}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BUCKETS.map(b => (
            <div key={b.key} className={cn("p-4 rounded-2xl border", b.bg, b.border)}>
              <p className={cn("text-[10px] font-medium uppercase tracking-wide", b.text)}>{t(b.labelKey)}</p>
              <p className="text-xl font-bold text-white tracking-tighter mt-1">{convert(aging?.buckets?.[b.key] || 0)}</p>
            </div>
          ))}
        </div>

        <Table head={[t('client'), t('phone'), t('debts_label'), t('age_days_label'), '']}>
          {(aging?.debtors || []).map((d: any) => {
            const b = BUCKET_MAP[d.bucket];
            const danger = d.age_days > 90;
            return (
              <tr key={d.id} className={cn("group transition-colors", danger ? "bg-rose-500/[0.06]" : "hover:bg-white/[0.02]")}>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    {d.kind === 'company' ? <Building2 size={13} className="text-gray-500 shrink-0" /> : <User size={13} className="text-gray-500 shrink-0" />}
                    <span className="text-[13px] font-semibold text-white truncate">{d.name}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-[11px] text-gray-400 font-mono">{d.phone || '—'}</td>
                <td className="px-5 py-2.5 text-[13px] font-bold text-rose-500">{convert(d.debt || 0)}</td>
                <td className="px-5 py-2.5 text-[13px] font-semibold text-gray-300">{d.age_days}</td>
                <td className="px-5 py-2.5 text-right">
                  {b && <span className={cn("text-[9px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md", b.bg, b.text)}>{t(b.labelKey)}</span>}
                </td>
              </tr>
            );
          })}
        </Table>
        <Note>90+ {t('aging_90_plus')} — {t('at_risk_debt')}.</Note>
      </Section>

      {/* ── BLOK 3: ABC TAHLIL ── */}
      <Section icon={Users} title={t('abc_analysis')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['A', 'B', 'C'] as const).map(cls => {
            const s = CLASS_STYLE[cls];
            const count = abc?.summary?.[`${cls}_count`] || 0;
            const rev = abc?.summary?.[`${cls}_revenue`] || 0;
            return (
              <div key={cls} className={cn("p-4 rounded-2xl border flex items-center gap-3", s.bg, s.border)}>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0", s.bg, s.text)}>{cls}</div>
                <div className="min-w-0">
                  <p className={cn("text-[13px] font-bold", s.text)}>{convert(rev)} <span className="text-gray-500 font-medium">· {pct(rev)}%</span></p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{count} {t('clients')}{cls === 'A' ? ` · ${t('abc_a_desc')}` : ''}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Table head={[t('client'), t('revenue_label'), t('class_label')]}>
          {(abc?.clients || []).map((c: any) => {
            const s = CLASS_STYLE[c.class] || CLASS_STYLE.C;
            return (
              <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    {c.kind === 'company' ? <Building2 size={13} className="text-gray-500 shrink-0" /> : <User size={13} className="text-gray-500 shrink-0" />}
                    <span className="text-[13px] font-semibold text-white truncate">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-[13px] font-bold text-white">{convert(c.revenue || 0)}</td>
                <td className="px-5 py-2.5 text-right">
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-md", s.bg, s.text)}>{c.class}</span>
                </td>
              </tr>
            );
          })}
        </Table>
        <Note>A — 80%. {t('abc_a_desc')}.</Note>
      </Section>

      {/* ── BLOK 4: O'LIK ZAXIRA ── */}
      <Section icon={Snowflake} title={t('dead_stock')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex-1">
            <div>
              <span className="text-[11px] font-medium text-amber-500 uppercase tracking-wide flex items-center gap-2">
                <Snowflake size={15} /> {t('frozen_capital')}
              </span>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{dead?.dead_count || 0} · {deadDays}+ {t('days_since_sale')}</p>
            </div>
            <span className="text-2xl font-bold text-amber-500 tracking-tighter">{convert(dead?.total_frozen || 0)}</span>
          </div>
          <div className="flex gap-2 bg-white/5 border border-white/5 rounded-2xl p-2 shrink-0">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => reloadDead(d)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all",
                  deadDays === d ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {deadLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl"><Loader2 className="animate-spin text-primary" size={28} /></div>}
          <Table head={[t('name'), t('sku'), t('stock'), t('frozen_capital'), t('days_since_sale')]}>
            {(dead?.items || []).map((it: any) => (
              <tr key={it.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-gray-500 shrink-0" />
                    <span className="text-[13px] font-semibold text-white truncate">{it.name}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-[11px] text-gray-400 font-mono uppercase">{it.sku}</td>
                <td className="px-5 py-2.5 text-[13px] font-semibold text-gray-300">{Number(it.stock_qty).toFixed(2)}</td>
                <td className="px-5 py-2.5 text-[13px] font-bold text-amber-500">{convert(it.frozen_value || 0)}</td>
                <td className="px-5 py-2.5 text-right">
                  {it.never_sold ? (
                    <span className="text-[9px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500">{t('never_sold')}</span>
                  ) : (
                    <span className="text-[13px] font-semibold text-gray-300">{it.days_since_sale}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <Note>{t('dead_stock')} — {t('frozen_capital')}.</Note>
      </Section>
    </div>
  );
}

/* ── Kichik yordamchi komponentlar ── */

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2 px-2">
        <Icon size={17} className="text-primary" /> {title}
      </h2>
      {children}
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, iconBg, valueColor }: any) {
  return (
    <div className="p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-xl flex items-center gap-3">
      <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}><Icon size={18} strokeWidth={2.5} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 truncate">{label}</p>
        <p className={cn("text-xl font-bold tracking-tighter truncate", valueColor)}>{value}</p>
        {sub && <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">{sub}</p>}
      </div>
    </div>
  );
}

function Table({ head, children }: any) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              {head.map((h: string, i: number) => (
                <th key={i} className={cn("px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide", i === head.length - 1 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Note({ children }: any) {
  return <p className="text-[10px] text-gray-500 font-medium leading-relaxed px-2">{children}</p>;
}
