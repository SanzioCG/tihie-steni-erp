import React from 'react';
import { Menu, Bell, User } from 'lucide-react';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-20 border-b border-app-border bg-app-card/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobil menyu tugmasi */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-app-fg/5 hover:bg-primary/10 text-app-muted hover:text-primary transition-all"
        >
          <Menu size={24} />
        </button>
        <h2 className="font-bold text-lg text-app-fg hidden sm:block">Operatsion Panel</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-app-muted hover:text-app-fg relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-app-card" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-app-border">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-app-fg">Admin Foydalanuvchi</p>
            <p className="text-[10px] text-app-muted">Boshqaruvchi</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}