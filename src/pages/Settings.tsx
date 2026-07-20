import { useState, useEffect } from 'react';
import { User, Save, Loader2, Users, Store, Plus, Trash2, X, Globe, Settings as SettingsIcon, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  isCurrentlySubscribed,
  subscribeUserToPush,
  getNotificationPermission,
} from '../lib/pushNotifications';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { profile, user, updateLocalProfile } = useAuthStore();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'director';

  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'staff'>('profile');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [storeInfo, setStoreInfo] = useState({ name: '', address: '', phone: '' });
  const [staff, setStaff] = useState<any[]>([]);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '', role: 'manager' });

  const pushSupported = isPushSupported();
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile]);

  useEffect(() => {
    if (pushSupported) isCurrentlySubscribed().then(setPushSubscribed);
  }, [pushSupported]);

  const handleEnablePush = async () => {
    if (!user?.id) return;
    setPushLoading(true);
    try {
      const ok = await subscribeUserToPush(user.id);
      if (ok) {
        setPushSubscribed(true);
        toast.success(t('push_enabled'));
      } else {
        toast.error(getNotificationPermission() === 'denied' ? t('push_denied') : t('push_error'));
      }
    } catch {
      toast.error(t('push_error'));
    } finally {
      setPushLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const { data: st } = await supabase.from('profiles').select('*').order('role');
    const { data: setts } = await supabase.from('app_settings').select('*').single();
    if (st) setStaff(st);
    if (setts) setStoreInfo(setts);
  };

  useEffect(() => {
    if (isAdmin) fetchAdminData();
  }, [isAdmin]);

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (!error) {
      updateLocalProfile({ full_name: fullName });
      toast.success(t('profile_updated'));
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...storeInfo }]);
    if (!error) toast.success(t('settings_saved'));
    else toast.error(error.message);
    setLoading(false);
  };

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.full_name) {
      return toast.error(t('fill_all_fields'));
    }
    if (newStaff.password.length < 6) {
      return toast.error(t('password_min6_error'));
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: newStaff,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(t('staff_added'));
      setShowAddStaff(false);
      setNewStaff({ email: '', password: '', full_name: '', role: 'manager' });
      fetchAdminData();
    } catch (err: any) {
      toast.error(t('error_prefix') + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (!error) {
      toast.success(t('role_changed'));
      fetchAdminData();
    } else {
      toast.error(error.message);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`${name} - ${t('confirm_delete')}`)) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      toast.success(t('staff_deleted'));
      fetchAdminData();
    } else {
      toast.error(error.message);
    }
  };

  const visibleStaff = profile?.role === 'director' 
    ? staff.filter(s => s.role !== 'admin')
    : staff;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 animate-in fade-in font-sans text-left">
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter px-2 flex items-center gap-2">
        <SettingsIcon size={22} className="text-primary" /> {t('settings')}
      </h2>

      <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 mx-2">
        <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={14}/>} label={t('profile')} />
        {isAdmin && (
          <>
            <TabBtn active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Store size={14}/>} label={t('store_config')} />
            <TabBtn active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={14}/>} label={t('staff')} />
          </>
        )}
      </div>

      <div className="mx-2">
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl">
                <User size={48} className="text-gray-700" />
              </div>
              <div className="text-center">
                <h4 className="text-xl font-bold text-white uppercase">{profile?.full_name}</h4>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wide mt-1">{profile?.role}</p>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">{t('full_name_label')}</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 text-sm uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 flex items-center gap-2">
                  <Globe size={12} /> {t('language')}
                </label>
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                  {[
                    { code: 'uz', label: "O'zbek" },
                    { code: 'ru', label: 'Русский' },
                    { code: 'en', label: 'English' },
                  ].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all",
                        i18n.language === lang.code ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"
                      )}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {pushSupported && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 flex items-center gap-2">
                    <Bell size={12} /> {t('notifications')}
                  </label>
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", pushSubscribed ? "bg-primary/10 text-primary" : "bg-white/5 text-gray-500")}>
                      {pushSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white uppercase truncate">
                        {pushSubscribed ? t('notifications_enabled') : t('enable_notifications')}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t('push_hint')}</p>
                    </div>
                    {!pushSubscribed && (
                      <button
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                        className="px-5 py-3 bg-primary text-black font-bold rounded-xl uppercase text-[10px] tracking-wide flex items-center gap-2 shrink-0 disabled:opacity-50"
                      >
                        {pushLoading ? <Loader2 className="animate-spin" size={14} /> : <Bell size={14} strokeWidth={3} />}
                        {t('enable_notifications')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={loading} className="w-full py-5 bg-primary text-black font-bold rounded-2xl shadow-lg uppercase text-[11px] tracking-wide flex justify-center items-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />} {t('save')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'system' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl">
            <h3 className="text-white font-bold uppercase text-sm italic">{t('store_details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label={t('store_name_label')} value={storeInfo.name} onChange={(v:string) => setStoreInfo({...storeInfo, name: v})} />
              <InputBlock label={t('address_label')} value={storeInfo.address} onChange={(v:string) => setStoreInfo({...storeInfo, address: v})} />
              <InputBlock label={t('phone_label')} value={storeInfo.phone} onChange={(v:string) => setStoreInfo({...storeInfo, phone: v})} />
            </div>
            
            <button onClick={handleSaveSystem} disabled={loading} className="w-full py-5 bg-primary text-black font-bold rounded-2xl uppercase text-[11px] tracking-wide">
              {loading ? <Loader2 className="animate-spin inline" size={18} /> : t('save')}
            </button>
          </motion.div>
        )}

        {activeTab === 'staff' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-white font-bold uppercase text-sm italic">{t('staff')} ({visibleStaff.length})</h3>
              <button onClick={() => setShowAddStaff(true)} className="px-6 py-3 bg-primary text-black font-bold rounded-2xl uppercase text-[10px] tracking-wide flex items-center gap-2">
                <Plus size={14} strokeWidth={3} /> {t('new_staff')}
              </button>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr className="text-gray-400 text-[10px] font-bold uppercase">
                    <th className="px-8 py-5">{t('name')}</th>
                    <th className="px-8 py-5">Email</th>
                    <th className="px-8 py-5">{t('role')}</th>
                    <th className="px-8 py-5 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleStaff.map(s => {
                    const isSelf = s.id === user?.id;
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="px-8 py-4 font-bold text-white uppercase text-sm">{s.full_name} {isSelf && <span className="text-[9px] text-primary ml-2">({t('you')})</span>}</td>
                        <td className="px-8 py-4 text-xs text-gray-400 font-mono">{s.email}</td>
                        <td className="px-8 py-4">
                          {isSelf ? (
                            <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase border text-primary border-primary/20 bg-primary/5">{s.role}</span>
                          ) : (
                            <select 
                              value={s.role} 
                              onChange={e => handleChangeRole(s.id, e.target.value)}
                              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase text-white outline-none cursor-pointer"
                            >
                              <option value="manager" className="bg-black">manager</option>
                              <option value="director" className="bg-black">director</option>
                              {profile?.role === 'admin' && <option value="admin" className="bg-black">admin</option>}
                            </select>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {!isSelf && (
                            <button 
                              onClick={() => handleDeleteStaff(s.id, s.full_name)} 
                              className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showAddStaff && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
              onClick={() => setShowAddStaff(false)} 
            />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white italic uppercase tracking-tight">{t('new_staff')}</h3>
                <button onClick={() => setShowAddStaff(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <InputBlock label={t('full_name_label')} value={newStaff.full_name} onChange={(v: string) => setNewStaff({...newStaff, full_name: v})} />
                <InputBlock label="Email" value={newStaff.email} onChange={(v: string) => setNewStaff({...newStaff, email: v})} placeholder="email@example.com" />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">{t('password_min6')}</label>
                  <input 
                    type="password" 
                    value={newStaff.password} 
                    onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary/20 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">{t('role')}</label>
                  <select 
                    value={newStaff.role} 
                    onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none text-sm uppercase"
                  >
                    <option value="manager" className="bg-black">Manager</option>
                    <option value="director" className="bg-black">Director</option>
                    {profile?.role === 'admin' && <option value="admin" className="bg-black">Admin</option>}
                  </select>
                </div>
              </div>

              <button 
                onClick={handleAddStaff} 
                disabled={loading} 
                className="w-full py-5 bg-primary text-black font-bold rounded-2xl uppercase text-[11px] tracking-wide flex justify-center items-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />} {t('create')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all", active ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white")}>
      {icon} {label}
    </button>
  );
}

function InputBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary/20 text-sm" />
    </div>
  );
}