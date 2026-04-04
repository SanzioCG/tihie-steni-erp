// src/components/TopBar.tsx

import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuthStore();
  const { i18n, t } = useTranslation();

  return (
    <header className="h-20 bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between font-sans">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
        <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] hidden md:block">
          Holding Operations Control
        </h2>
      </div>

      <div className="flex items-center gap-6">
        {/* 🌍 TIL HEADER'DA */}
        <div className="bg-white/5 p-1 rounded-xl border border-white/5 hidden sm:flex shadow-inner">
          {['uz', 'ru', 'en'].map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                i18n.language === lang ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* 👤 PROFIL VA AVATAR */}
        <div className="flex items-center gap-4 pl-6 border-l border-white/5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-white uppercase tracking-tight leading-none">
              {profile?.full_name || 'Admin'}
            </p>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1 opacity-70">
              {profile?.role || 'Boshqaruvchi'}
            </p>
          </div>
          <div className="relative w-11 h-11 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700">
                <User size={24} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}