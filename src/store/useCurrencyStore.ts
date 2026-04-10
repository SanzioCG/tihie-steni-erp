import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CurrencyType = 'USD' | 'UZS' | 'EUR' | 'RUB';

interface CurrencyState {
  currency: CurrencyType;
  rates: {
    USD: number;
    EUR: number;
    RUB: number;
  };
  lastUpdated: number;
  setCurrency: (c: CurrencyType) => void;
  fetchRates: () => Promise<void>;
  convert: (amountInUSD: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      // Boshlang'ich (fallback) kurslar
      rates: { USD: 12850, EUR: 13650, RUB: 145 },
      lastUpdated: 0,

      setCurrency: (c) => set({ currency: c }),
      
      fetchRates: async () => {
        const state = get(); // Hozirgi holatni olish
        const now = Date.now();
        
        // 🟢 24 soat kesh mantiqi
        if (now - state.lastUpdated < 24 * 60 * 60 * 1000) {
           return;
        }

        const proxies = [
          'https://corsproxy.io/?',
          'https://api.allorigins.win/get?url='
        ];

        for (const proxy of proxies) {
          try {
            const targetUrl = encodeURIComponent('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
            const res = await fetch(`${proxy}${targetUrl}`);
            if (!res.ok) continue;

            const raw = await res.json();
            const data = typeof raw.contents === 'string' ? JSON.parse(raw.contents) : (raw.contents || raw);
            
            const findRate = (code: string) => parseFloat(data.find((i: any) => i.Ccy === code)?.Rate || "0");
            const usd = findRate('USD');

            if (usd > 0) {
              // 🟢 Store-ni yangilash
              set({ 
                rates: { USD: usd, EUR: findRate('EUR'), RUB: findRate('RUB') },
                lastUpdated: now 
              });
              console.log("Valyuta kursi online yangilandi.");
              return; // Muvaffaqiyatli bo'lsa, sikldan chiqamiz
            }
          } catch (e) {
            console.warn(`Proxy (${proxy}) orqali kursni yuklab bo'lmadi, keyingisiga o'tilmoqda...`);
          }
        }
      },

      convert: (amountInUSD: number) => {
        const { currency, rates } = get();
        const value = Number(amountInUSD || 0);

        if (currency === 'USD') {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        }
        if (currency === 'UZS') {
          return new Intl.NumberFormat('uz-UZ').format(Math.round(value * rates.USD)) + " so'm";
        }

        // Boshqa valyutalar uchun: Avval so'mga, keyin o'sha valyutaga
        const rateInUZS = value * rates.USD;
        if (currency === 'EUR') {
          return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(rateInUZS / rates.EUR);
        }
        if (currency === 'RUB') {
          return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(rateInUZS / rates.RUB);
        }
        return value.toString();
      }
    }),
    { name: 'currency-storage' }
  )
);