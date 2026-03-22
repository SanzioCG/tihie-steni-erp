import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'uz' | 'ru' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Tarjimalar bazasi
const translations: Record<Language, Record<string, string>> = {
  uz: {
    dashboard: "Boshqaruv paneli",
    inventory: "Ombor",
    sales: "Sotuvlar",
    supplies: "Ta'minot",
    crm: "Mijozlar",
    reports: "Hisobotlar",
    settings: "Sozlamalar",
    revenue: "Jami tushum",
    profit: "Sof foyda",
    inventory_value: "Ombor qiymati",
    low_stock: "Kam qolganlar",
    save: "Saqlash",
    logout: "Chiqish"
  },
  ru: {
    dashboard: "Панель управления",
    inventory: "Склад",
    sales: "Продажи",
    supplies: "Поставки",
    crm: "Клиенты",
    reports: "Отчеты",
    settings: "Настройки",
    revenue: "Общая выручка",
    profit: "Чистая прибыль",
    inventory_value: "Стоимость склада",
    low_stock: "Мало в наличии",
    save: "Сохранить",
    logout: "Выход"
  },
  en: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    sales: "Sales",
    supplies: "Supplies",
    crm: "CRM",
    reports: "Reports",
    settings: "Settings",
    revenue: "Total Revenue",
    profit: "Net Profit",
    inventory_value: "Inventory Value",
    low_stock: "Low Stock",
    save: "Save",
    logout: "Logout"
  }
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'uz',
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const { language } = get();
        return translations[language][key] || key;
      },
    }),
    {
      name: 'language-storage', // Til sozlamasini brauzerda saqlab qoladi
    }
  )
);