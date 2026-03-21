import React from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Moon,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t, i18n } = useTranslation();

  const sections = [
    {
      title: 'Profile Settings',
      items: [
        { icon: User, label: 'Personal Information', value: 'Admin User' },
        { icon: Shield, label: 'Password & Security', value: 'Last changed 2 months ago' },
      ]
    },
    {
      title: 'Application Settings',
      items: [
        { icon: Globe, label: 'Language', value: i18n.language.toUpperCase() },
        { icon: Bell, label: 'Notifications', value: 'Enabled' },
        { icon: Moon, label: 'Dark Mode', value: 'System' },
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('settings')}</h2>
        <p className="text-slate-500">Manage your account and app preferences</p>
      </div>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {section.items.map((item, j) => (
                <button key={j} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <item.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
        <h3 className="text-rose-900 font-bold mb-2">Danger Zone</h3>
        <p className="text-rose-700 text-sm mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
