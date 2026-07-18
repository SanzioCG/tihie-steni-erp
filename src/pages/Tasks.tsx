import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
  Loader2, CheckCircle2, Phone, User, CalendarClock,
  AlertTriangle, Clock, CalendarDays, Inbox, MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface CrmTask {
  id: string;
  title: string;
  type?: string;
  due_date?: string;
  priority?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  overdue?: boolean;
}

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_crm_overview');
    if (!error && data) setOverview(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const completeTask = async (id: string) => {
    setCompleting(id);
    try {
      const { error } = await supabase.rpc('complete_task', { p_task_id: id });
      if (error) throw error;
      toast.success(t('task_completed'));
      await fetchOverview();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    } finally {
      setCompleting(null);
    }
  };

  const groups = useMemo(() => {
    const tasks: CrmTask[] = overview?.tasks || [];
    const isToday = (d?: string) => {
      if (!d) return false;
      return new Date(d).toDateString() === new Date().toDateString();
    };
    return {
      overdue: tasks.filter((task) => task.overdue),
      today: tasks.filter((task) => !task.overdue && isToday(task.due_date)),
      upcoming: tasks.filter((task) => !task.overdue && !isToday(task.due_date)),
    };
  }, [overview]);

  const totalOpen = (overview?.tasks || []).length;
  const recentInteractions = overview?.recent_interactions || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <CalendarClock size={22} className="text-primary" /> {t('crm_tasks')}
        </h2>
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-0.5">{t('tasks_subtitle')}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mx-2">
        <KpiTile icon={AlertTriangle} label={t('overdue_tasks')} value={overview?.overdue_count ?? groups.overdue.length} color="text-rose-500" bg="bg-rose-500/10" border="border-rose-500/20" />
        <KpiTile icon={Clock} label={t('today_tasks')} value={overview?.today_count ?? groups.today.length} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />
        <KpiTile icon={CalendarDays} label={t('upcoming_tasks')} value={groups.upcoming.length} color="text-primary" bg="bg-primary/10" border="border-primary/20" />
      </div>

      {totalOpen === 0 ? (
        <div className="py-24 text-center text-gray-700 mx-2">
          <Inbox size={56} className="mx-auto mb-4 opacity-30" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em]">{t('no_tasks')}</p>
        </div>
      ) : (
        <div className="space-y-5 mx-2">
          <TaskSection title={t('overdue_tasks')} icon={AlertTriangle} accent="text-rose-500" tasks={groups.overdue} onComplete={completeTask} completing={completing} language={i18n.language} />
          <TaskSection title={t('today_tasks')} icon={Clock} accent="text-amber-500" tasks={groups.today} onComplete={completeTask} completing={completing} language={i18n.language} />
          <TaskSection title={t('upcoming_tasks')} icon={CalendarDays} accent="text-primary" tasks={groups.upcoming} onComplete={completeTask} completing={completing} language={i18n.language} />
        </div>
      )}

      {/* SO'NGGI MULOQOTLAR */}
      {recentInteractions.length > 0 && (
        <div className="mx-2 space-y-4">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 pl-1">
            <MessageSquare size={14} /> {t('timeline_interaction')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentInteractions.map((it: any) => (
              <div key={it.id} className="p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{it.subject || t(`type_${it.type}`)}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 truncate">
                    {it.client_name} • {t(`type_${it.type}`)}{it.outcome ? ` · ${t(`outcome_${it.outcome}`)}` : ''}
                  </p>
                </div>
                <span className="text-[9px] text-gray-600 font-bold shrink-0">{new Date(it.occurred_at).toLocaleDateString(i18n.language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, color, bg, border }: any) {
  return (
    <div className={cn("p-4 rounded-2xl border flex items-center gap-3", bg, border)}>
      <div className={cn("p-2.5 rounded-xl bg-white/5 shrink-0", color)}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className={cn("text-[10px] font-black uppercase tracking-wide truncate", color)}>{label}</p>
        <p className="text-xl font-black text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function TaskSection({ title, icon: Icon, accent, tasks, onComplete, completing, language }: any) {
  if (!tasks || tasks.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pl-1", accent)}>
        <Icon size={14} strokeWidth={3} /> {title} <span className="text-gray-600">· {tasks.length}</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task: CrmTask) => (
          <TaskCard key={task.id} task={task} accent={accent} onComplete={onComplete} completing={completing} language={language} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, accent, onComplete, completing, language }: any) {
  const { t } = useTranslation();
  const isBusy = completing === task.id;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-white uppercase tracking-tight">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            <User size={12} /> <span className="truncate">{task.client_name || '—'}</span>
          </div>
          {task.client_phone && (
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600 font-bold font-mono">
              <Phone size={12} /> {task.client_phone}
            </div>
          )}
        </div>
        {task.priority === 'high' && (
          <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-rose-500/15 text-rose-500 shrink-0">{t('priority_high')}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
        <span className={cn("text-[10px] font-bold flex items-center gap-1.5", accent)}>
          <CalendarClock size={13} />
          {task.due_date ? new Date(task.due_date).toLocaleString(language) : '—'}
        </span>
        <button
          onClick={() => onComplete(task.id)}
          disabled={isBusy}
          className="px-4 py-2.5 bg-primary text-black font-black rounded-xl uppercase text-[9px] tracking-widest flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50"
        >
          {isBusy ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} {t('mark_done')}
        </button>
      </div>
    </motion.div>
  );
}
