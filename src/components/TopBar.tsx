import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, Globe, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export default function TopBar() {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="h-16 border-b border-app-border bg-app-bg/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-end px-8 gap-4 transition-all">
      
      {/* Theme Toggle */}
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2.5 rounded-xl bg-app-card border border-app-border text-app-fg hover:border-primary transition-all active:scale-90 shadow-sm"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Language Selector */}
      <div className="relative group">
        <button className="flex items-center gap-3 px-3 py-1.5 bg-app-card border border-app-border rounded-xl hover:border-primary/50 transition-all shadow-sm">
          <Globe size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase">{i18n.language}</span>
          <ChevronDown size={14} className="text-app-muted" />
        </button>
        
        <div className="absolute right-0 mt-2 w-28 py-2 bg-app-card border border-app-border rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl z-50">
          {['uz', 'ru', 'en'].map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={cn(
                "w-full px-4 py-2 text-xs font-bold text-left transition-colors",
                i18n.language === lang ? "text-primary bg-primary/10" : "text-app-muted hover:text-app-fg hover:bg-app-fg/5"
              )}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}