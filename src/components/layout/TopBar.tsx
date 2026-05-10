import React from 'react';
import { Menu, Bell, User, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { profile } = useAuthStore();
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <header className="h-20 bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between font-sans">
      
      {/* CHAP TOMON: MENU VA TITLE */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90"
        >
          <Menu size={22} />
        </button>
        <div className="hidden md:block">
           <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
             Operations Control
           </p>
        </div>
      </div>

      {/* O'NG TOMON: TIL, BILDDIRISHNOMALAR VA PROFIL */}
      <div className="flex items-center gap-3 md:gap-6">
        
        {/* 🌍 TIL ALMASHTIRGICH (ENDI MOBILDA HAM KO'RINADI) */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner scale-90 md:scale-100">
          {['uz', 'ru', 'en'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={cn(
                "px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                i18n.language === lang 
                  ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                  : "text-gray-500 hover:text-white"
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* 👤 PROFIL VA AVATAR */}
        <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-white/5">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
              {profile?.full_name?.split(' ')[0] || 'Admin'}
            </p>
            <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-1 opacity-60">
              {profile?.role || 'User'}
            </p>
          </div>
          
          <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl shrink-0 group cursor-pointer hover:border-primary/50 transition-all">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700">
                <User size={20} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}