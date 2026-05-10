import React, { useState, useEffect, useCallback } from 'react';
import { User, Camera, Save, Loader2, ShieldCheck, Scissors, Users, Store, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import { cn } from '../lib/utils';

export default function Settings() {
  const { t } = useTranslation();
  const { profile, user, updateLocalProfile } = useAuthStore();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'director';

  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'staff'>('profile');
  const [loading, setLoading] = useState(false);

  // States
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [storeInfo, setStoreInfo] = useState({ name: '', address: '', phone: '', manual_rate: '' });
  const [staff, setStaff] = useState<any[]>([]);

  // Crop States
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const fetchAdminData = async () => {
        const { data: st } = await supabase.from('profiles').select('*').order('role');
        const { data: setts } = await supabase.from('app_settings').select('*').single();
        if (st) setStaff(st);
        if (setts) setStoreInfo(setts);
      };
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (!error) {
      updateLocalProfile({ full_name: fullName });
      alert(t('profile_updated') || "Profil yangilandi!");
    }
    setLoading(false);
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...storeInfo }]);
    if (!error) alert(t('settings_saved') || "Tizim sozlamalari saqlandi!");
    setLoading(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => { setImage(reader.result as string); setIsCropping(true); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in font-sans text-left">
      <h2 className="text-4xl font-black text-white uppercase tracking-tighter px-2">{t('settings')}</h2>

      {/* TAB SELECTOR */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-3xl border border-white/5 mx-2">
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
              <div className="relative">
                <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl">
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-700" />}
                </div>
                <label className="absolute -bottom-2 -right-2 p-3 bg-primary text-black rounded-2xl cursor-pointer hover:scale-110 transition-all border-4 border-[#0c0c0e]">
                  <Camera size={20} strokeWidth={3} /><input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                </label>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black text-white uppercase">{profile?.full_name}</h4>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">{profile?.role}</p>
              </div>
            </div>
            <div className="max-w-md mx-auto space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-600 uppercase ml-2">{t('full_name_label')}</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 text-sm uppercase" />
               </div>
               <button onClick={handleSaveProfile} disabled={loading} className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg uppercase text-[11px] tracking-widest flex justify-center items-center gap-3">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />} {t('save')}
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'system' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h3 className="text-white font-black uppercase text-sm italic">{t('store_details')}</h3>
                   <InputBlock label={t('store_name')} value={storeInfo.name} onChange={(v:any) => setStoreInfo({...storeInfo, name: v})} />
                   <InputBlock label={t('store_address')} value={storeInfo.address} onChange={(v:any) => setStoreInfo({...storeInfo, address: v})} />
                   <InputBlock label={t('store_phone')} value={storeInfo.phone} onChange={(v:any) => setStoreInfo({...storeInfo, phone: v})} />
                </div>
                <div className="space-y-4">
                   <h3 className="text-white font-black uppercase text-sm italic">{t('financial_config')}</h3>
                   <div className="p-6 bg-white/2 border border-white/5 rounded-3xl space-y-4">
                      <p className="text-[9px] text-gray-500 font-bold uppercase leading-relaxed">DO'KONNING ICHKI DOLLAR KURSI (BANK KURSI O'RNIGA ISHLATILADI)</p>
                      <InputBlock label={t('internal_usd_rate')} value={storeInfo.manual_rate} onChange={(v:any) => setStoreInfo({...storeInfo, manual_rate: v})} placeholder="13000" />
                   </div>
                </div>
             </div>
             <button onClick={handleSaveSystem} className="w-full py-5 bg-white/5 hover:bg-primary hover:text-black text-primary font-black rounded-2xl transition-all uppercase text-[11px] tracking-widest border border-primary/20">{t('update_settings')}</button>
          </motion.div>
        )}

        {activeTab === 'staff' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0c0c0e] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
             <table className="w-full text-left">
                <thead className="bg-white/5"><tr className="text-gray-500 text-[10px] font-black uppercase"><th className="px-8 py-5">{t('name')}</th><th className="px-8 py-5">{t('role')}</th><th className="px-8 py-5 text-right">{t('actions')}</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                   {staff.map(s => (
                     <tr key={s.id} className="hover:bg-white/[0.02]"><td className="px-8 py-4 font-bold text-white uppercase text-sm">{s.full_name}</td><td className="px-8 py-4"><span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase border", s.role === 'admin' ? "text-primary border-primary/20 bg-primary/5" : "text-gray-500 border-white/10")}>{s.role}</span></td><td className="px-8 py-4 text-right"><button className="text-[10px] font-black text-rose-500 uppercase hover:underline">{t('manage')}</button></td></tr>
                   ))}
                </tbody>
             </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", active ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white")}>{icon} {label}</button>
  );
}

function InputBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-600 uppercase ml-1">{label}</label><input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary/20 text-sm" /></div>
  );
}