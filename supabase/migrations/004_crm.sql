-- ============================================================
-- 004: CRM MODULI — muloqotlar, vazifalar, mijoz kartochkasi
-- Kamchilik: tizim mijoz bilan bo'lgan munosabatni eslamas edi.
-- ============================================================

-- ---------- Mijoz kartochkasini boyitish ----------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS responsible_id  UUID REFERENCES auth.users,      -- javobgar xodim
  ADD COLUMN IF NOT EXISTS source          TEXT,                            -- qayerdan (Instagram/Tavsiya/Ko'chadan...)
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'active'
    CHECK (status IN ('lead','active','inactive')),                          -- lead=potentsial mijoz
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;                       -- oxirgi kontakt (avtomatik yangilanadi)

-- ---------- 1. MULOQOTLAR JURNALI ----------
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,                                        -- kim qildi
  type TEXT NOT NULL CHECK (type IN ('call','meeting','message','note','visit')),
  direction TEXT CHECK (direction IN ('incoming','outgoing','internal')),    -- kiruvchi/chiquvchi
  subject TEXT,                                                              -- mavzu (qisqa)
  notes TEXT,                                                                -- batafsil
  outcome TEXT CHECK (outcome IN ('answered','no_answer','callback','deal','rejected','info') OR outcome IS NULL),
  occurred_at TIMESTAMPTZ DEFAULT NOW(),                                     -- qachon bo'lgan
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions (client_id, occurred_at DESC);

-- ---------- 2. VAZIFALAR / FOLLOW-UP ----------
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users,                                    -- kimga biriktirilgan
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'followup' CHECK (type IN ('call','meeting','followup','other')),
  due_date TIMESTAMPTZ,                                                      -- muddat
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  created_by UUID REFERENCES auth.users,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_open ON client_tasks (due_date)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON client_tasks (assigned_to, status);

-- ---------- RLS ----------
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks        ENABLE ROW LEVEL SECURITY;

-- Muloqotlar: hamma authenticated ko'radi va yozadi (yozish RPC orqali tavsiya)
CREATE POLICY "interactions_select" ON client_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "interactions_insert" ON client_interactions FOR INSERT TO authenticated WITH CHECK (true);

-- Vazifalar: hamma ko'radi; o'zgartirish — o'ziniki, javobgar yoki admin/manager
CREATE POLICY "tasks_select" ON client_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON client_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON client_tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.current_role() IN ('admin','director','manager')
  );

-- ============================================================
-- RPC 1: log_interaction — muloqot yozish (atomik)
-- Bir chaqiruvda: muloqotni yozadi + last_contact_at yangilaydi +
-- (ixtiyoriy) keyingi follow-up vazifasini yaratadi + audit.
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_interaction(
  p_client_id UUID,
  p_type TEXT,
  p_direction TEXT,
  p_subject TEXT,
  p_notes TEXT,
  p_outcome TEXT DEFAULT NULL,
  p_followup_title TEXT DEFAULT NULL,       -- bo'lsa, vazifa yaratiladi
  p_followup_due TIMESTAMPTZ DEFAULT NULL,
  p_followup_assignee UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interaction_id UUID;
  v_task_id UUID;
  v_client_name TEXT;
BEGIN
  SELECT full_name INTO v_client_name FROM clients WHERE id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mijoz topilmadi'; END IF;

  INSERT INTO client_interactions (client_id, user_id, type, direction, subject, notes, outcome)
  VALUES (p_client_id, auth.uid(), p_type, p_direction, p_subject, p_notes, p_outcome)
  RETURNING id INTO v_interaction_id;

  UPDATE clients SET last_contact_at = NOW() WHERE id = p_client_id;

  -- Ixtiyoriy: keyingi qadam vazifasi
  IF p_followup_title IS NOT NULL THEN
    INSERT INTO client_tasks (client_id, assigned_to, title, type, due_date, created_by)
    VALUES (p_client_id, COALESCE(p_followup_assignee, auth.uid()),
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
-- RPC 2: complete_task — vazifani bajarilgan deb belgilash
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE client_tasks
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_task_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Vazifa topilmadi yoki allaqachon yopilgan'; END IF;
  RETURN jsonb_build_object('success', true);
END $$;

-- ============================================================
-- RPC 3: get_crm_overview — CRM boshqaruv paneli
-- Bugungi vazifalar, muddati o'tganlar, yaqin uchrashuvlar, so'nggi muloqotlar
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_crm_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  SELECT jsonb_build_object(
    'overdue_count', (SELECT COUNT(*) FROM client_tasks
        WHERE status='pending' AND due_date < NOW()),
    'today_count',   (SELECT COUNT(*) FROM client_tasks
        WHERE status='pending' AND due_date::date = CURRENT_DATE),
    'tasks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ct.id, 'title', ct.title, 'type', ct.type,
        'due_date', ct.due_date, 'priority', ct.priority,
        'client_id', ct.client_id, 'client_name', c.full_name,
        'client_phone', c.phone,
        'overdue', (ct.due_date < NOW())
      ) ORDER BY ct.due_date ASC NULLS LAST)
      FROM client_tasks ct LEFT JOIN clients c ON c.id = ct.client_id
      WHERE ct.status = 'pending'
        AND (ct.assigned_to = auth.uid() OR public.current_role() IN ('admin','director','manager'))
      LIMIT 50
    ), '[]'::jsonb),
    'recent_interactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'type', i.type, 'direction', i.direction,
        'subject', i.subject, 'outcome', i.outcome,
        'occurred_at', i.occurred_at,
        'client_name', c.full_name
      ) ORDER BY i.occurred_at DESC)
      FROM (SELECT * FROM client_interactions ORDER BY occurred_at DESC LIMIT 15) i
      LEFT JOIN clients c ON c.id = i.client_id
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ============================================================
-- get_client_summary'ni BOYITISH — timeline endi muloqot va
-- vazifalarni ham o'z ichiga oladi (sotuv + pul + muloqot + vazifa).
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
    'timeline', COALESCE((
      SELECT jsonb_agg(ev ORDER BY (ev->>'created_at') DESC)
      FROM (
        -- Sotuvlar
        SELECT jsonb_build_object(
          'id', s.id, 'event_type', 'sale',
          'title', COALESCE(p.name_uz, 'Sotuv'),
          'amount', s.total_amount, 'status', s.status,
          'created_at', s.created_at) AS ev
        FROM sales s LEFT JOIN products p ON p.id = s.product_id
        WHERE s.client_id = p_client_id
        UNION ALL
        -- Pul o'tkazmalari
        SELECT jsonb_build_object(
          'id', t.id, 'event_type', t.type,
          'title', COALESCE(t.description, t.category),
          'amount', t.amount, 'status', t.category,
          'created_at', t.created_at)
        FROM transactions t WHERE t.client_id = p_client_id
        UNION ALL
        -- Muloqotlar (qo'ng'iroq/uchrashuv/xabar)
        SELECT jsonb_build_object(
          'id', i.id, 'event_type', 'interaction',
          'title', COALESCE(i.subject, i.type),
          'amount', NULL, 'status', i.type || COALESCE(' · ' || i.outcome, ''),
          'created_at', i.occurred_at)
        FROM client_interactions i WHERE i.client_id = p_client_id
        UNION ALL
        -- Vazifalar
        SELECT jsonb_build_object(
          'id', ct.id, 'event_type', 'task',
          'title', ct.title,
          'amount', NULL, 'status', ct.status,
          'created_at', COALESCE(ct.due_date, ct.created_at))
        FROM client_tasks ct WHERE ct.client_id = p_client_id
        LIMIT 100
      ) x
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ---------- Huquqlar ----------
GRANT EXECUTE ON FUNCTION
  public.log_interaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID),
  public.complete_task(UUID),
  public.get_crm_overview()
TO authenticated;
