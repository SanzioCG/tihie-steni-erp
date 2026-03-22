import React, { useState } from 'react';
import { 
  User, Camera, Save, LogOut, Globe, Check 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("Admin Foydalanuvchi");

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500 text-left">
      {/* HEADER */}
      <div className="px-2">
        <h2 className="text-3xl font-black text-white uppercase tracking-tight ">
          {t('settings')}
        </h2>
        <p className="text-xs text-gray-500 font-medium opacity-60">
          Shaxsiy profil va tizim afzalliklarini boshqarish
        </p>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-10 relative overflow-hidden">
        {/* DECORATION */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

        {/* 1. AVATAR SECTION */}
        <div className="flex flex-col items-center gap-4 relative">
          <div className="relative">
            <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-inner">
              <User size={48} className="text-gray-700" />
            </div>
            <button className="absolute -bottom-1 -right-1 p-2.5 bg-primary text-black rounded-2xl shadow-lg hover:scale-110 transition-all border-4 border-[#0c0c0e]">
              <Camera size={18} />
            </button>
          </div>
          <div className="text-center">
            <h4 className="text-xl font-black text-white uppercase tracking-tighter">{name}</h4>
            <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mt-1">{t('admin')}</p>
          </div>
        </div>

        {/* 2. INPUT FIELDS */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-2">To'liq ismingiz</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary/30 transition-all" 
              placeholder="Ismingizni kiriting"
            />
          </div>

          {/* 3. LANGUAGE SELECTION (Profilga tegishli afzallik) */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Globe size={12} /> Tizim tili
            </label>
            <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5">
              {['uz', 'ru', 'en'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    i18n.language === lang 
                    ? "bg-primary text-black shadow-lg" 
                    : "text-gray-500 hover:text-white"
                  }`}
                >
                  {lang}
                  {i18n.language === lang && <Check size={12} strokeWidth={4} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. ACTIONS */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <button className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2">
            <Save size={18} /> {t('save')}
          </button>
          
          <button className="w-full py-4 text-rose-500 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-rose-500/5 rounded-2xl transition-all">
            <LogOut size={18} /> {t('logout')}
          </button>
        </div>
      </div>

      {/* FOOTER INFO */}
      <p className="text-center text-[10px] text-gray-700 font-bold uppercase tracking-[0.3em]">
        Tihie Steni ERP • v1.0.4
      </p>
    </div>
  );
}