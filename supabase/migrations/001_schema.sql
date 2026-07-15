-- ============================================================
-- TIHIE STENI ERP — TO'LIQ BACKEND SXEMASI (v2, reconstructed)
-- Frontend kontraktidan qayta tiklangan: 2026-07-08
-- 001: Jadvallar, indekslar, RLS
-- ============================================================

-- ---------- 1. PROFILES (RBAC) ----------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'salesperson'
    CHECK (role IN ('admin','director','manager','warehouseman','salesperson')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 2. APP SETTINGS (singleton, id=1) ----------
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT,
  store_phone TEXT,
  store_address TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 3. CATEGORIES ----------
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 4. PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL CHECK (unit IN ('m2','p.m','pcs')),
  image_url TEXT,
  series TEXT,
  average_cost NUMERIC DEFAULT 0,
  width NUMERIC, height NUMERIC, length NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 5. BATCHES (FIFO zaxira, narx bilan) ----------
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,             -- boshlang'ich kirim
  remaining_quantity NUMERIC NOT NULL DEFAULT 0,   -- qolgan (FIFO shu ustunda)
  purchase_price NUMERIC NOT NULL DEFAULT 0,       -- tannarx (USD)
  selling_price NUMERIC NOT NULL DEFAULT 0,        -- sotuv narxi (USD)
  min_limit NUMERIC DEFAULT 0,                     -- low-stock chegarasi
  width_m NUMERIC,                                 -- tekstil eni (m)
  length_m NUMERIC,                                -- uzunlik (m)
  color_name TEXT,
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT remaining_not_negative CHECK (remaining_quantity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_batches_product_fifo
  ON batches (product_id, created_at) WHERE remaining_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_batches_lowstock
  ON batches (remaining_quantity);

-- ---------- 6. CLIENTS (CRM) ----------
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  client_type TEXT NOT NULL DEFAULT 'Chakana'
    CHECK (client_type IN ('Chakana','VIP','Ulgurji')),
  balance NUMERIC NOT NULL DEFAULT 0,  -- manfiy = mijoz qarzdor
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_balance ON clients (balance);

-- ---------- 7. SALES (flat model: 1 qator = 1 mahsulot×partiya) ----------
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,      -- qaytarishda kamayadi
  unit_price NUMERIC NOT NULL DEFAULT 0,    -- sotuv narxi (o'sha paytdagi)
  cost_price NUMERIC NOT NULL DEFAULT 0,    -- tannarx snapshot (foyda uchun)
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending','completed','cancelled','returned','partial_return')),
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales (client_id);

-- ---------- 8. TRANSACTIONS (kassa: kirim/chiqim) ----------
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_type_cat ON transactions (type, category);

-- ---------- 9. OFFICE EXPENSES ----------
CREATE TABLE IF NOT EXISTS office_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 10. AUDIT LOGS ----------
-- Diqqat: frontendda ikki xil ustun to'plami ishlatilgan
-- (user_name/description VA entity/details) — hammasini qo'llab-quvvatlaymiz.
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,          -- CREATED / UPDATED / DELETED / SALE / RETURN ...
  entity TEXT,                   -- MIJOZ / MAHSULOT / SOTUV ...
  details TEXT,
  description TEXT,
  user_name TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

-- ---------- 11. COMMERCIAL OFFERS (KP) ----------
CREATE TABLE IF NOT EXISTS commercial_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 12. PUSH SUBSCRIPTIONS ----------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT GENERATED ALWAYS AS (subscription->>'endpoint') STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- ============================================================
-- RLS — hamma policy FAQAT authenticated rolga.
-- (Eski "USING (true)" policylar anon o'qishga ruxsat berardi!)
-- ============================================================

-- Yordamchi: joriy foydalanuvchi roli (SECURITY DEFINER — RLS rekursiyasiz)
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$;

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_offers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_admin_manage" ON profiles FOR ALL TO authenticated
  USING (public.current_role() IN ('admin','director'));

-- APP SETTINGS
CREATE POLICY "settings_select" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin" ON app_settings FOR ALL TO authenticated
  USING (public.current_role() IN ('admin','director'));

-- CATEGORIES / PRODUCTS
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_modify" ON categories FOR ALL TO authenticated
  USING (public.current_role() IN ('admin','director','manager'));

CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_modify" ON products FOR ALL TO authenticated
  USING (public.current_role() IN ('admin','director','manager'));

-- BATCHES (yozish faqat RPC/ombor rollari orqali)
CREATE POLICY "batches_select" ON batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches_modify" ON batches FOR ALL TO authenticated
  USING (public.current_role() IN ('admin','director','manager','warehouseman'));

-- CLIENTS
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (public.current_role() IN ('admin','director','manager','salesperson'));
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (public.current_role() IN ('admin','director'));

-- SALES (yozish faqat RPC orqali bo'lishi kerak — to'g'ridan-to'g'ri INSERT yopiq)
CREATE POLICY "sales_select" ON sales FOR SELECT TO authenticated USING (true);

-- TRANSACTIONS (yozish faqat RPC orqali)
CREATE POLICY "tx_select" ON transactions FOR SELECT TO authenticated USING (true);

-- OFFICE EXPENSES (yozish faqat RPC orqali)
CREATE POLICY "office_select" ON office_expenses FOR SELECT TO authenticated USING (true);

-- AUDIT LOGS (o'qish hamma authenticated; yozish — RPC ichida SECURITY DEFINER)
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- COMMERCIAL OFFERS
CREATE POLICY "kp_select" ON commercial_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "kp_insert" ON commercial_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kp_delete" ON commercial_offers FOR DELETE TO authenticated
  USING (public.current_role() IN ('admin','director'));

-- PUSH SUBSCRIPTIONS (faqat o'ziniki)
CREATE POLICY "push_own" ON push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
