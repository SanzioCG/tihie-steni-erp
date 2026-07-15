-- ============================================================
-- 005: KUCHLI CRM — voronka, teglar, fayllar, chat, avtomatlashtirish, analitika
-- Poydevor (004) ustiga to'liq CRM qatlami.
-- ============================================================

-- Yordamchi: updated_at avtomatik yangilash
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

-- ============================================================
-- A. SAVDO VORONKASI (DEALS / PIPELINE) — CRM yuragi
-- ============================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new','contacted','offer_sent','negotiation','won','lost')),
  expected_amount NUMERIC DEFAULT 0,          -- kutilayotgan summa (USD)
  probability INT DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  offer_id UUID REFERENCES commercial_offers(id) ON DELETE SET NULL,  -- KP bilan bog'lanish
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,               -- yutilganda sotuv
  owner_id UUID REFERENCES auth.users,        -- javobgar sotuvchi
  lost_reason TEXT,                           -- yo'qotilsa sabab
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage) WHERE stage NOT IN ('won','lost');
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (client_id);
DROP TRIGGER IF EXISTS deals_touch ON deals;
CREATE TRIGGER deals_touch BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- B. TEGLAR / SEGMENTATSIYA
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS client_tags (
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- ============================================================
-- C. MIJOZ FAYLLARI (chizma, rasm, shartnoma) — Supabase Storage
-- ============================================================
CREATE TABLE IF NOT EXISTS client_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                     -- Storage'dagi yo'l
  file_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_files_client ON client_files (client_id);

-- ============================================================
-- D. CHAT / XABARLAR — ichki jamoa + tashqi (Telegram)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users,        -- NULL = mijozdan kelgan (tashqi)
  channel TEXT NOT NULL DEFAULT 'internal'
    CHECK (channel IN ('internal','telegram','sms','app')),
  direction TEXT NOT NULL DEFAULT 'internal'
    CHECK (direction IN ('in','out','internal')),
  body TEXT,
  attachment_url TEXT,
  external_id TEXT,                             -- Telegram message_id (sinxron uchun)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_client ON client_messages (client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON client_messages (client_id) WHERE is_read = false;

-- Mijozning Telegram chat_id sini saqlash (tashqi chat uchun)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_select" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert" ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deals_update" ON deals FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.current_role() IN ('admin','director','manager'));
CREATE POLICY "deals_delete" ON deals FOR DELETE TO authenticated
  USING (public.current_role() IN ('admin','director'));

CREATE POLICY "tags_all" ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "client_tags_all" ON client_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "files_select" ON client_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert" ON client_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_delete" ON client_files FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.current_role() IN ('admin','director','manager'));

-- Chat: hamma ko'radi; ichki xabar yozganda sender_id = o'zi bo'lishi shart.
-- (Tashqi kiruvchi xabarlar edge function tomonidan service_role bilan yoziladi — RLS chetlab o'tiladi)
CREATE POLICY "messages_select" ON client_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert" ON client_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update" ON client_messages FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- E. VORONKA RPC'lari
-- ============================================================

-- Bitim bosqichini o'zgartirish (+ yutilsa vaqtni, yo'qotilsa sababni yozadi)
CREATE OR REPLACE FUNCTION public.move_deal_stage(
  p_deal_id UUID, p_stage TEXT, p_lost_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title TEXT;
BEGIN
  UPDATE deals
  SET stage = p_stage,
      lost_reason = CASE WHEN p_stage = 'lost' THEN p_lost_reason ELSE lost_reason END,
      probability = CASE p_stage
        WHEN 'new' THEN 10 WHEN 'contacted' THEN 25 WHEN 'offer_sent' THEN 50
        WHEN 'negotiation' THEN 75 WHEN 'won' THEN 100 WHEN 'lost' THEN 0
        ELSE probability END
  WHERE id = p_deal_id
  RETURNING title INTO v_title;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bitim topilmadi'; END IF;

  PERFORM write_audit('DEAL', 'BITIM', v_title || ' → ' || p_stage, 'System');
  RETURN jsonb_build_object('success', true);
END $$;

-- ============================================================
-- F. AVTOMATLASHTIRISH — pg_cron bilan kunlik ishlaydigan funksiyalar
-- ============================================================

-- Qarzdor mijozlar uchun avtomatik "qarz undirish" vazifasi
-- (balans manfiy, ochiq vazifasi yo'q bo'lganlar uchun)
CREATE OR REPLACE FUNCTION public.generate_debt_tasks()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT := 0; v_c RECORD;
BEGIN
  FOR v_c IN
    SELECT id, full_name, responsible_id, balance
    FROM clients
    WHERE balance < 0
      AND NOT EXISTS (
        SELECT 1 FROM client_tasks t
        WHERE t.client_id = clients.id AND t.status = 'pending' AND t.type = 'call'
          AND t.title ILIKE '%qarz%'
      )
  LOOP
    INSERT INTO client_tasks (client_id, assigned_to, title, description, type, due_date, priority)
    VALUES (v_c.id, v_c.responsible_id,
            'Qarz undirish: ' || v_c.full_name,
            'Balans: $' || v_c.balance || '. Mijoz bilan bog''lanib to''lovni eslating.',
            'call', CURRENT_DATE + 1, 'high');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- "Sovib borayotgan" mijozlar — 60 kundan beri xarid qilmagan aktiv mijozlar
CREATE OR REPLACE FUNCTION public.generate_churn_tasks()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT := 0; v_c RECORD;
BEGIN
  FOR v_c IN
    SELECT c.id, c.full_name, c.responsible_id
    FROM clients c
    WHERE c.status = 'active'
      AND (SELECT MAX(created_at) FROM sales s WHERE s.client_id = c.id) < NOW() - INTERVAL '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM client_tasks t
        WHERE t.client_id = c.id AND t.status = 'pending' AND t.title ILIKE '%qayta jalb%'
      )
  LOOP
    INSERT INTO client_tasks (client_id, assigned_to, title, description, type, due_date, priority)
    VALUES (v_c.id, v_c.responsible_id,
            'Qayta jalb: ' || v_c.full_name,
            '60+ kun xarid qilmadi. Yangi taklif yoki qo''ng''iroq qiling.',
            'followup', CURRENT_DATE + 2, 'normal');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- Muddati kelgan vazifalar bo'yicha push (edge function chaqiradi — G bo'limiga qarang)
CREATE OR REPLACE FUNCTION public.get_due_tasks_for_push()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'task_id', t.id, 'title', t.title,
    'client_name', c.full_name, 'assigned_to', t.assigned_to,
    'due_date', t.due_date)), '[]'::jsonb)
  FROM client_tasks t LEFT JOIN clients c ON c.id = t.client_id
  WHERE t.status = 'pending' AND t.due_date::date = CURRENT_DATE;
$$;

-- ============================================================
-- G. ANALITIKA RPC'lari
-- ============================================================

-- Savdo voronkasi: bosqich bo'yicha soni + summa
CREATE OR REPLACE FUNCTION public.get_sales_funnel()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'stage', stage, 'count', cnt, 'total', total) ORDER BY ord), '[]'::jsonb)
  FROM (
    SELECT stage, COUNT(*) cnt, COALESCE(SUM(expected_amount),0) total,
      CASE stage WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'offer_sent' THEN 3
        WHEN 'negotiation' THEN 4 WHEN 'won' THEN 5 WHEN 'lost' THEN 6 END ord
    FROM deals GROUP BY stage
  ) x;
$$;

-- Manba ROI: qaysi manba qancha daromad keltirdi
CREATE OR REPLACE FUNCTION public.get_source_roi()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'source', COALESCE(source, 'Noma''lum'),
    'clients', client_cnt, 'revenue', revenue) ORDER BY revenue DESC), '[]'::jsonb)
  FROM (
    SELECT c.source, COUNT(DISTINCT c.id) client_cnt,
           COALESCE(SUM(s.total_amount), 0) revenue
    FROM clients c
    LEFT JOIN sales s ON s.client_id = c.id AND s.status <> 'cancelled'
    GROUP BY c.source
  ) x;
$$;

-- Xodim faolligi: muloqot, yutilgan bitim, sotuv (davr bo'yicha)
CREATE OR REPLACE FUNCTION public.get_staff_activity(
  p_from TEXT DEFAULT NULL, p_to TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_from TIMESTAMPTZ := COALESCE(p_from::timestamptz, NOW() - INTERVAL '30 days');
  v_to   TIMESTAMPTZ := COALESCE(p_to::timestamptz, NOW());
  r JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', p.id, 'name', p.full_name,
    'interactions', COALESCE(i.cnt, 0),
    'deals_won', COALESCE(d.cnt, 0),
    'sales_total', COALESCE(s.total, 0)) ORDER BY COALESCE(s.total,0) DESC), '[]'::jsonb)
  INTO r
  FROM profiles p
  LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM client_interactions
             WHERE occurred_at BETWEEN v_from AND v_to GROUP BY user_id) i ON i.user_id = p.id
  LEFT JOIN (SELECT owner_id, COUNT(*) cnt FROM deals
             WHERE stage='won' AND updated_at BETWEEN v_from AND v_to GROUP BY owner_id) d ON d.owner_id = p.id
  LEFT JOIN (SELECT created_by, SUM(total_amount) total FROM sales
             WHERE created_at BETWEEN v_from AND v_to AND status<>'cancelled' GROUP BY created_by) s ON s.created_by = p.id;
  RETURN r;
END $$;

-- Chat: xabarlarni o'qilgan deb belgilash
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE client_messages SET is_read = true
  WHERE client_id = p_client_id AND is_read = false AND direction = 'in';
  RETURN jsonb_build_object('success', true);
END $$;

-- ============================================================
-- Huquqlar
-- ============================================================
GRANT EXECUTE ON FUNCTION
  public.move_deal_stage(UUID, TEXT, TEXT),
  public.generate_debt_tasks(),
  public.generate_churn_tasks(),
  public.get_due_tasks_for_push(),
  public.get_sales_funnel(),
  public.get_source_roi(),
  public.get_staff_activity(TEXT, TEXT),
  public.mark_messages_read(UUID)
TO authenticated;

-- ============================================================
-- H. pg_cron JADVALLARI (Pro'da pg_cron kengaytmasini yoqing)
-- Dashboard → Database → Extensions → pg_cron, pg_net ni yoqing, keyin:
-- ============================================================
-- SELECT cron.schedule('debt-tasks',  '0 8 * * *', 'SELECT public.generate_debt_tasks();');
-- SELECT cron.schedule('churn-tasks', '0 8 * * 1', 'SELECT public.generate_churn_tasks();');
-- (Push uchun pg_net bilan edge function chaqiruvi — DEPLOY qo'llanmasiga qarang)

-- ============================================================
-- I. STORAGE BUCKET (mijoz fayllari uchun) — Dashboard yoki SQL:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('client-files','client-files', false)
--   ON CONFLICT DO NOTHING;
-- (Keyin bucketga authenticated upload/download policy qo'ying)
