import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CurrencyType = 'USD' | 'UZS' | 'EUR' | 'RUB';

interface CurrencyState {
  currency: CurrencyType;
  rates: {
    USD: number; // 1 USD necha so'm (Masalan: 12850)
    EUR: number; // 1 EUR necha so'm (Masalan: 13600)
    RUB: number; // 1 RUB necha so'm (Masalan: 140)
  };
  setCurrency: (c: CurrencyType) => void;
  fetchRates: () => Promise<void>;
  convert: (amountInUSD: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      // Boshlang'ich kurslar (Agar bankdan yuklanmasa ishlaydi)
      rates: { USD: 12850, EUR: 13600, RUB: 140 },
      setCurrency: (c) => set({ currency: c }),
      
      fetchRates: async () => {
        try {
          // Markaziy bank API (CORS uchun proxy bilan)
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://cbu.uz/uz/arkhiv-kursov-valyut/json/')}`);
          const raw = await res.json();
          const data = JSON.parse(raw.contents);
          
          // Kurslarni izlab topish
          const usdRate = parseFloat(data.find((i: any) => i.Ccy === 'USD').Rate);
          const eurRate = parseFloat(data.find((i: any) => i.Ccy === 'EUR').Rate);
          const rubRate = parseFloat(data.find((i: any) => i.Ccy === 'RUB').Rate);

          set({ rates: { USD: usdRate, EUR: eurRate, RUB: rubRate } });
          console.log("Bank kurslari yangilandi:", { usdRate, eurRate, rubRate });
        } catch (e) {
          console.error("Bank kursini yangilashda xato!");
        }
      },

      convert: (amountInUSD: number) => {
        const { currency, rates } = get();
        const value = Number(amountInUSD || 0);

        // 🟢 1. AGAR DOLLAR BO'LSA
        if (currency === 'USD') {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        }

        // 🟢 2. AGAR SO'M BO'LSA ($ * kurs)
        if (currency === 'UZS') {
          const result = value * rates.USD; // MASALAN: 600 * 12850 = 7,710,000
          return new Intl.NumberFormat('uz-UZ').format(Math.round(result)) + " so'm";
        }

        // 🟢 3. AGAR EVRO BO'LSA ($ * kurs_usd / kurs_eur)
        if (currency === 'EUR') {
          const result = (value * rates.USD) / rates.EUR;
          return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(result);
        }

        // 🟢 4. AGAR RUBL BO'LSA ($ * kurs_usd / kurs_rub)
        if (currency === 'RUB') {
          const result = (value * rates.USD) / rates.RUB;
          return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(result);
        }

        return value.toString();
      }
    }),
    { name: 'currency-storage' }
  )
);