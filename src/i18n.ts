import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Sidebar & Menu
      dashboard: 'Dashboard',
      finance: 'Finance',
      sales: 'Sales',
      clients: 'Clients',
      debts: 'Debts',
      inventory: 'Inventory',
      products: 'Products',
      stock: 'Stock', // <-- To'g'irlandi
      expenses: 'Office Expenses',
      audit: 'Audit Log',
      settings: 'Settings',
      logout: 'Logout',

      // Dashboard Stats
      total_revenue: 'Total Revenue',
      inventory_value: 'Inventory Value',
      debts_label: 'Debts (Debtor)',
      low_stock: 'Low Stock',
      recent_activity: 'Recent Activity',
      live_monitoring: 'Live Monitoring',
      sales_dynamics: 'Sales Dynamics',

      // Common Actions
      add_new: 'Add New',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      confirm: 'Confirm',
      search: 'Search...',
      loading: 'Loading...',
      no_data: 'No data found',
      success: 'Success',
      error: 'Error'
    }
  },
  uz: {
    translation: {
      dashboard: 'Boshqaruv paneli',
      finance: 'Moliya',
      sales: 'Sotuvlar',
      clients: 'Mijozlar',
      debts: 'Qarzlar',
      inventory: 'Inventar',
      products: 'Mahsulotlar',
      stock: 'Zaxira', // <-- To'g'irlandi
      expenses: 'Ofis Xarajatlari',
      audit: 'Audit Jurnali',
      settings: 'Sozlamalar',
      logout: 'Chiqish',

      total_revenue: 'Jami tushum',
      inventory_value: 'Ombor qiymati',
      debts_label: 'Qarzlar (Debitor)',
      low_stock: 'Kam zaxira',
      recent_activity: 'So\'nggi harakatlar',
      live_monitoring: 'Jonli kuzatuv',
      sales_dynamics: 'Savdo dinamikasi',

      add_new: 'Yangi qo\'shish',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      delete: 'O\'chirish',
      edit: 'Tahrirlash',
      confirm: 'Tasdiqlash',
      search: 'Qidirish...',
      loading: 'Yuklanmoqda...',
      no_data: 'Ma\'lumot topilmadi',
      success: 'Muvaffaqiyat',
      error: 'Xato'
    }
  },
  ru: {
    translation: {
      dashboard: 'Панель управления',
      finance: 'Финансы',
      sales: 'Продажи',
      clients: 'Клиенты',
      debts: 'Долги',
      inventory: 'Инвентарь',
      products: 'Продукты',
      stock: 'в наличии', // <-- To'g'irlandi
      expenses: 'Офисные расходы',
      audit: 'Журнал аудита',
      settings: 'Настройки',
      logout: 'Выйти',

      total_revenue: 'Общая выручка',
      inventory_value: 'Стоимость склада',
      debts_label: 'Задолженность',
      low_stock: 'Мало в наличии',
      recent_activity: 'Последние действия',
      live_monitoring: 'Живой мониторинг',
      sales_dynamics: 'Динамика продаж',

      add_new: 'Добавить',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Изменить',
      confirm: 'Подтвердить',
      search: 'Поиск...',
      loading: 'Загрузка...',
      no_data: 'Данные не найдены',
      success: 'Успех',
      error: 'Ошибка'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uz', // Standart til o'zbekcha bo'ladi
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;