-- ============================================================
-- 009: FK'lar auth.users → profiles
-- Muammo: xodimga ishora qiluvchi ustunlar auth.users'ga bog'langan,
-- shuning uchun PostgREST orqali profiles bilan join qilib bo'lmaydi
-- (frontend har safar id→ism xaritasini qo'lda qurishga majbur).
-- Yechim: FK'ni profiles(id) ga o'tkazamiz. profiles.id = auth.users.id,
-- ya'ni ma'no o'zgarmaydi, lekin PostgREST bog'lanishni ko'radi.
--
-- ON DELETE SET NULL — xodim o'chirilsa yozuv qolsin, faqat muallif NULL bo'lsin
-- (tarixiy ma'lumot yo'qolmasin).
-- ============================================================

-- ---------- SALES ----------
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- TRANSACTIONS ----------
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- OFFICE EXPENSES ----------
ALTER TABLE office_expenses DROP CONSTRAINT IF EXISTS office_expenses_created_by_fkey;
ALTER TABLE office_expenses ADD CONSTRAINT office_expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- AUDIT LOGS ----------
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_created_by_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- COMMERCIAL OFFERS ----------
ALTER TABLE commercial_offers DROP CONSTRAINT IF EXISTS commercial_offers_created_by_fkey;
ALTER TABLE commercial_offers ADD CONSTRAINT commercial_offers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CLIENTS (javobgar xodim) ----------
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_responsible_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_responsible_id_fkey
  FOREIGN KEY (responsible_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CONTACTS ----------
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_created_by_fkey;
ALTER TABLE contacts ADD CONSTRAINT contacts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CLIENT INTERACTIONS ----------
ALTER TABLE client_interactions DROP CONSTRAINT IF EXISTS client_interactions_user_id_fkey;
ALTER TABLE client_interactions ADD CONSTRAINT client_interactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CLIENT TASKS ----------
ALTER TABLE client_tasks DROP CONSTRAINT IF EXISTS client_tasks_assigned_to_fkey;
ALTER TABLE client_tasks ADD CONSTRAINT client_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE client_tasks DROP CONSTRAINT IF EXISTS client_tasks_created_by_fkey;
ALTER TABLE client_tasks ADD CONSTRAINT client_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- DEALS ----------
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_owner_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_created_by_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CLIENT FILES ----------
ALTER TABLE client_files DROP CONSTRAINT IF EXISTS client_files_uploaded_by_fkey;
ALTER TABLE client_files ADD CONSTRAINT client_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- CLIENT MESSAGES ----------
ALTER TABLE client_messages DROP CONSTRAINT IF EXISTS client_messages_sender_id_fkey;
ALTER TABLE client_messages ADD CONSTRAINT client_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- TEGILMAYDI (ataylab):
--   profiles.id → auth.users        (bu asosiy bog'lanish)
--   push_subscriptions.user_id      → auth.users, CASCADE (obuna bilan ketsin)
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- TEKSHIRISH — endi PostgREST join ishlaydi:
--   supabase.from('deals').select('*, owner:profiles!deals_owner_id_fkey(full_name)')
--   supabase.from('client_tasks').select('*, assignee:profiles!client_tasks_assigned_to_fkey(full_name)')
--
-- SQL bilan:
-- SELECT conname, conrelid::regclass AS tbl, confrelid::regclass AS refs
-- FROM pg_constraint
-- WHERE contype='f' AND confrelid = 'profiles'::regclass
-- ORDER BY 2;
-- ============================================================
