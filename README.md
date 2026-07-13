# 🏛️ Silent Walls ERP (ТИХИЕ СТЕНЫ)

Tekstil va qurilish materiallari biznesi uchun ERP tizim.

## 🚀 Asosiy xususiyatlar

- **📏 Metrologik mantiq:** Tekstil (m²) va profil (m) uchun avtomatik hisoblash
- **🛒 Multi-item POS:** Savatli kassa, FIFO bo'yicha batch'larni kamaytirish
- **💰 Real-time valyuta:** CBU API orqali USD/UZS/EUR/RUB konversiyasi
- **👥 CRM:** Mijoz tarixi, qarz nazorati, balans
- **🛡️ RBAC:** Admin, Director, Manager rollari + RLS
- **📊 Analitika:** Moliya grafigi, kategoriya bo'yicha xarajatlar

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind v4, Framer Motion
- **Routing:** React Router v6
- **Data:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State:** Zustand (auth, currency)
- **Monitoring:** Sentry
- **PDF:** jsPDF + autoTable
- **PWA:** Workbox + Vite PWA Plugin

## ⚙️ O'rnatish

```bash
git clone <repo-url>
cd tihie-steni-erp
npm install
cp .env.example .env
# .env ichidagi qiymatlarni o'z Supabase loyihangizdan to'ldiring
npm run dev
```

## 🔐 Environment variables

Quyidagi sirlar `.env` faylida bo'lishi kerak (`.env.example` ga qarang):

- `VITE_SUPABASE_URL` — Supabase loyiha URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon kalit
- `VITE_VAPID_PUBLIC_KEY` — Push notifications uchun
- `VAPID_PRIVATE_KEY` — Supabase Edge Function secrets'ga qo'yiladi
- `VITE_SENTRY_DSN` — Error monitoring

## 🗄️ Database

Sxema va RPC funksiyalar "source of truth" — `supabase/migrations/` (001_schema, 002_rpc_functions, 003_seed, 004_crm). Asosiy RPC'lar: `process_sale_secure_v2`, `process_product_return`, `collect_debt_secure`, `log_interaction`, `complete_task`, `get_crm_overview`.

## 📦 Build

```bash
npm run build
```

`dist/` papkasini Vercel/Netlify/o'zingiz xohlagan hostingga deploy qiling.

## 🆘 Disaster recovery

Bazaviy baxtsiz hodisalar uchun:
1. **DB tushib qolsa:** Supabase Dashboard → Database → Backups → Restore
2. **VAPID kalitlar oshkor bo'lsa:** `npx web-push generate-vapid-keys` → `.env` va Supabase secrets'ni yangilang, keyin `DELETE FROM push_subscriptions;`
3. **Build buzilsa:** Oldingi commit'ga `git revert` qiling

## 📄 Litsenziya

Private.