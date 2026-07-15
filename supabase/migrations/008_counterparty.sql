-- ============================================================
-- 008: FAZA 1 — KONTRAGENT MODELI (B2B poydevori)
--   * clients → kontragent (odam YOKI kompaniya)
--   * contacts → kompaniya ichidagi odamlar
--   * rekvizitlar (INN, bank, MFO) — rasmiy hujjatlar uchun
--   * client_type → kanonik inglizcha qiymatlar (UI tarjima qiladi)
-- ============================================================

-- ============================================================
-- 1. CLIENTS → KONTRAGENT
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'person'
    CHECK (kind IN ('person','company')),
  -- Rekvizitlar (faqat kind='company' uchun mazmunli)
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS mfo TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS director_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_kind ON clients (kind);
CREATE INDEX IF NOT EXISTS idx_clients_inn ON clients (inn) WHERE inn IS NOT NULL;

-- ------------------------------------------------------------
-- 1.1 client_type → kanonik qiymatlar
-- Sabab: baza o'zbekcha saqlasa, RU/EN foydalanuvchi hech qachon
-- tarjimani ko'rmaydi. Baza kanonik (inglizcha), UI tarjima qiladi.
-- i18n kalitlari allaqachon mavjud: retail / vip / wholesale
-- ------------------------------------------------------------
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;

UPDATE clients SET client_type = CASE client_type
  WHEN 'Chakana'  THEN 'retail'
  WHEN 'VIP'      THEN 'vip'
  WHEN 'Ulgurji'  THEN 'wholesale'
  ELSE 'retail'
END
WHERE client_type IN ('Chakana','VIP','Ulgurji');

ALTER TABLE clients ALTER COLUMN client_type SET DEFAULT 'retail';

ALTER TABLE clients ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('retail','vip','wholesale'));

-- ============================================================
-- 2. CONTACTS — kompaniya ichidagi odamlar
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,                              -- Direktor, Snabjenets, Prorab...
  phone TEXT,
  email TEXT,
  telegram TEXT,
  is_primary BOOLEAN DEFAULT false,           -- asosiy aloqa shaxsi
  notes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts (client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone) WHERE phone IS NOT NULL;

-- Har kontragentda faqat BITTA asosiy kontakt bo'lsin
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_one_primary
  ON contacts (client_id) WHERE is_primary = true;

-- ------------------------------------------------------------
-- 2.1 Muloqot / vazifa / bitim → kontaktga bog'lanish
-- (client_id qoladi — kim to'laydi; contact_id — kim bilan gaplashdik)
-- ------------------------------------------------------------
ALTER TABLE client_interactions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated
  USING (public.current_role() IN ('admin','director','manager','salesperson'));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated
  USING (public.current_role() IN ('admin','director','manager'));

-- ============================================================
-- 4. RPC: log_interaction — contact_id qo'shildi
-- DIQQAT: parametr soni o'zgardi → eski funksiyani DROP qilish SHART,
-- aks holda overload yaratiladi va PostgREST "not unique" xatosi beradi.
-- ============================================================
DROP FUNCTION IF EXISTS public.log_interaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID);

CREATE OR REPLACE FUNCTION public.log_interaction(
  p_client_id UUID,
  p_type TEXT,
  p_direction TEXT,
  p_subject TEXT,
  p_notes TEXT,
  p_outcome TEXT DEFAULT NULL,
  p_followup_title TEXT DEFAULT NULL,
  p_followup_due TIMESTAMPTZ DEFAULT NULL,
  p_followup_assignee UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL          -- YANGI: kim bilan gaplashdik
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interaction_id UUID;
  v_task_id UUID;
  v_client_name TEXT;
  v_direction TEXT;
BEGIN
  SELECT full_name INTO v_client_name FROM clients WHERE id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kontragent topilmadi'; END IF;

  -- 'note' turi ichki eslatma — na kiruvchi, na chiquvchi
  v_direction := CASE WHEN p_type = 'note' THEN 'internal'
                      ELSE COALESCE(p_direction, 'outgoing') END;

  INSERT INTO client_interactions
    (client_id, contact_id, user_id, type, direction, subject, notes, outcome)
  VALUES
    (p_client_id, p_contact_id, auth.uid(), p_type, v_direction, p_subject, p_notes, p_outcome)
  RETURNING id INTO v_interaction_id;

  UPDATE clients SET last_contact_at = NOW() WHERE id = p_client_id;

  IF p_followup_title IS NOT NULL THEN
    INSERT INTO client_tasks
      (client_id, contact_id, assigned_to, title, type, due_date, created_by)
    VALUES
      (p_client_id, p_contact_id, COALESCE(p_followup_assignee, auth.uid()),
       p_followup_title,
       CASE WHEN p_type = 'meeting' THEN 'meeting' ELSE 'call' END,
       p_followup_due, auth.uid())
    RETURNING id INTO v_task_id;
  END IF;

  PERFORM write_audit('CONTACT', 'MIJOZ',
    v_client_name || ' — ' || p_type || COALESCE(': ' || p_subject, ''), 'System');

  RETURN jsonb_build_object('success', true,
    'interaction_id', v_interaction_id, 'task_id', v_task_id);
END $$;

-- ============================================================
-- 5. get_client_summary — kontaktlar ro'yxati qo'shildi
-- (signature o'zgarmadi → CREATE OR REPLACE xavfsiz)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_client_summary(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_gross NUMERIC; v_returns NUMERIC; v_count INT; v_balance NUMERIC;
  r JSONB;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_gross, v_count
  FROM sales WHERE client_id = p_client_id AND status <> 'cancelled';

  SELECT COALESCE(SUM(amount), 0) INTO v_returns
  FROM transactions
  WHERE client_id = p_client_id AND type='expense' AND category ILIKE '%vozvrat%';

  SELECT balance INTO v_balance FROM clients WHERE id = p_client_id;

  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'grossSales',   v_gross,
      'netRevenue',   v_gross - v_returns,
      'returnsTotal', v_returns,
      'balance',      COALESCE(v_balance, 0),
      'salesCount',   v_count,
      'avgCheck',     CASE WHEN v_count > 0 THEN ROUND(v_gross / v_count, 2) ELSE 0 END,
      'topProduct',   (SELECT p.name_uz FROM sales s JOIN products p ON p.id = s.product_id
                        WHERE s.client_id = p_client_id
                        GROUP BY p.name_uz ORDER BY SUM(s.total_amount) DESC LIMIT 1),
      'lastContact',  (SELECT last_contact_at FROM clients WHERE id = p_client_id),
      'openTasks',    (SELECT COUNT(*) FROM client_tasks
                        WHERE client_id = p_client_id AND status = 'pending')
    ),
    -- YANGI: kontaktlar (kompaniya ichidagi odamlar)
    'contacts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'full_name', c.full_name, 'position', c.position,
        'phone', c.phone, 'email', c.email, 'telegram', c.telegram,
        'is_primary', c.is_primary
      ) ORDER BY c.is_primary DESC, c.full_name)
      FROM contacts c WHERE c.client_id = p_client_id
    ), '[]'::jsonb),
    'timeline', COALESCE((
      SELECT jsonb_agg(ev ORDER BY (ev->>'created_at') DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', s.id, 'event_type', 'sale',
          'title', COALESCE(p.name_uz, 'Sotuv'),
          'amount', s.total_amount, 'status', s.status,
          'created_at', s.created_at) AS ev
        FROM sales s LEFT JOIN products p ON p.id = s.product_id
        WHERE s.client_id = p_client_id
        UNION ALL
        SELECT jsonb_build_object(
          'id', t.id, 'event_type', t.type,
          'title', COALESCE(t.description, t.category),
          'amount', t.amount, 'status', t.category,
          'created_at', t.created_at)
        FROM transactions t WHERE t.client_id = p_client_id
        UNION ALL
        SELECT jsonb_build_object(
          'id', i.id, 'event_type', 'interaction',
          'title', COALESCE(i.subject, i.type),
          'amount', NULL, 'status', i.type || COALESCE(' · ' || i.outcome, ''),
          'contact_name', ct.full_name,
          'created_at', i.occurred_at)
        FROM client_interactions i
        LEFT JOIN contacts ct ON ct.id = i.contact_id
        WHERE i.client_id = p_client_id
        UNION ALL
        SELECT jsonb_build_object(
          'id', tk.id, 'event_type', 'task',
          'title', tk.title,
          'amount', NULL, 'status', tk.status,
          'created_at', COALESCE(tk.due_date, tk.created_at))
        FROM client_tasks tk WHERE tk.client_id = p_client_id
        LIMIT 100
      ) x
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ============================================================
-- 6. Kompaniyalar ro'yxati (rekvizitlar bilan) — hujjatlar uchun kerak bo'ladi
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_companies()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'full_name', c.full_name, 'inn', c.inn,
    'phone', c.phone, 'balance', c.balance, 'client_type', c.client_type,
    'contacts_count', (SELECT COUNT(*) FROM contacts ct WHERE ct.client_id = c.id),
    'has_requisites', (c.inn IS NOT NULL AND c.bank_account IS NOT NULL)
  ) ORDER BY c.full_name), '[]'::jsonb)
  FROM clients c WHERE c.kind = 'company';
$$;

-- ============================================================
-- 7. Huquqlar
-- ============================================================
GRANT EXECUTE ON FUNCTION
  public.log_interaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID),
  public.get_companies()
TO authenticated;

-- PostgREST keshini yangilash
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- TEKSHIRISH
-- ============================================================
-- SELECT id, full_name, kind, client_type FROM clients;
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'log_interaction';
--   → FAQAT BITTA qator bo'lishi kerak (pronargs = 10)
