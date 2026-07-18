-- ============================================================
-- 010: FAZA 2 — Bitim → Sotuv zanjiri
--   * deal_items — bitimdagi mahsulotlar
--   * win_deal_to_sale — bitimni bir tugma bilan sotuvga aylantirish (FIFO)
--   * bitim marjasi (real vaqtda ko'rish)
-- ============================================================

-- ============================================================
-- 1. DEAL_ITEMS — bitimdagi mahsulotlar
-- (KP items JSONB bilan bir xil g'oya, lekin normalizatsiyalangan)
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,                       -- snapshot (mahsulot o'chsa ham qoladi)
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,   -- taklif qilingan narx
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_items_deal ON deal_items (deal_id);

ALTER TABLE deal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_items_select" ON deal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "deal_items_all" ON deal_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- deals.expected_amount ni deal_items dan avtomatik yangilash
CREATE OR REPLACE FUNCTION public.recalc_deal_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deal UUID;
BEGIN
  v_deal := COALESCE(NEW.deal_id, OLD.deal_id);
  UPDATE deals SET expected_amount = COALESCE((
    SELECT SUM(quantity * unit_price) FROM deal_items WHERE deal_id = v_deal
  ), 0) WHERE id = v_deal;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS deal_items_recalc ON deal_items;
CREATE TRIGGER deal_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON deal_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_deal_amount();

-- ============================================================
-- 2. win_deal_to_sale — bitimni sotuvga aylantirish (atomik, FIFO)
-- Bitim mahsulotlarini process_sale_secure_v2 mantiqi bilan sotuvga o'tkazadi,
-- bitimni 'won' qiladi, deals.sale_id ni bog'laydi.
-- ============================================================
CREATE OR REPLACE FUNCTION public.win_deal_to_sale(
  p_deal_id UUID,
  p_total_paid NUMERIC,      -- naqd to'langan
  p_debt_amount NUMERIC,     -- qarzga qolgan
  p_user_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal RECORD;
  v_item RECORD;
  v_batch RECORD;
  v_need NUMERIC;
  v_take NUMERIC;
  v_total NUMERIC := 0;
  v_first_sale_id UUID;
  v_names TEXT := '';
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bitim topilmadi'; END IF;
  IF v_deal.stage = 'won' THEN RAISE EXCEPTION 'Bitim allaqachon yutilgan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM deal_items WHERE deal_id = p_deal_id) THEN
    RAISE EXCEPTION 'Bitimda mahsulot yo''q — avval mahsulot qo''shing';
  END IF;

  -- Har mahsulot uchun FIFO sotuv (process_sale_secure_v2 mantiqi)
  FOR v_item IN SELECT * FROM deal_items WHERE deal_id = p_deal_id LOOP
    v_need := v_item.quantity;
    IF v_need <= 0 THEN CONTINUE; END IF;

    FOR v_batch IN
      SELECT id, remaining_quantity, purchase_price
      FROM batches
      WHERE product_id = v_item.product_id AND remaining_quantity > 0
      ORDER BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_need <= 0;
      v_take := LEAST(v_need, v_batch.remaining_quantity);

      UPDATE batches SET remaining_quantity = remaining_quantity - v_take
      WHERE id = v_batch.id;

      INSERT INTO sales (client_id, product_id, batch_id, quantity,
                         unit_price, cost_price, total_amount, status, created_by)
      VALUES (v_deal.client_id, v_item.product_id, v_batch.id, v_take,
              v_item.unit_price, v_batch.purchase_price,
              v_take * v_item.unit_price, 'completed', auth.uid())
      RETURNING id INTO v_first_sale_id;

      v_need := v_need - v_take;
    END LOOP;

    IF v_need > 0 THEN
      RAISE EXCEPTION 'Zaxira yetarli emas: % (kam: %)', v_item.product_name, v_need;
    END IF;

    v_total := v_total + v_item.quantity * v_item.unit_price;
    v_names := v_names || COALESCE(v_item.product_name, '') || ', ';
  END LOOP;

  -- Kassa: to'langan summa
  IF p_total_paid > 0 THEN
    INSERT INTO transactions (type, amount, category, description, client_id, created_by)
    VALUES ('income', p_total_paid, 'Sotuv',
            'Bitim yutildi: ' || COALESCE(v_deal.title, ''), v_deal.client_id, auth.uid());
  END IF;

  -- Qarz
  IF p_debt_amount > 0 AND v_deal.client_id IS NOT NULL THEN
    UPDATE clients SET balance = balance - p_debt_amount WHERE id = v_deal.client_id;
  END IF;

  -- Bitimni yutilgan qilish
  UPDATE deals
  SET stage = 'won', probability = 100, sale_id = v_first_sale_id
  WHERE id = p_deal_id;

  PERFORM write_audit('DEAL', 'BITIM',
    'Bitim yutildi va sotuvga aylandi: ' || COALESCE(v_deal.title, '') ||
    ' | $' || v_total, p_user_name);

  RETURN jsonb_build_object('success', true, 'total', v_total, 'sale_id', v_first_sale_id);
END $$;

-- ============================================================
-- 3. get_deal_detail — bitim kartochkasi (mahsulotlar + marja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_deal_detail(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB; v_cost NUMERIC; v_revenue NUMERIC;
BEGIN
  -- Kutilayotgan tannarx (joriy FIFO narxidan taxminiy)
  SELECT
    COALESCE(SUM(di.quantity * COALESCE(p.average_cost, 0)), 0),
    COALESCE(SUM(di.quantity * di.unit_price), 0)
  INTO v_cost, v_revenue
  FROM deal_items di LEFT JOIN products p ON p.id = di.product_id
  WHERE di.deal_id = p_deal_id;

  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', di.id, 'product_id', di.product_id,
        'product_name', COALESCE(di.product_name, p.name_uz),
        'quantity', di.quantity, 'unit_price', di.unit_price,
        'line_total', di.quantity * di.unit_price,
        'in_stock', COALESCE((SELECT SUM(remaining_quantity) FROM batches
                     WHERE product_id = di.product_id), 0)
      ) ORDER BY di.created_at)
      FROM deal_items di LEFT JOIN products p ON p.id = di.product_id
      WHERE di.deal_id = p_deal_id
    ), '[]'::jsonb),
    'revenue', v_revenue,
    'est_cost', v_cost,
    'est_margin', v_revenue - v_cost,
    'est_margin_pct', CASE WHEN v_revenue > 0
                       THEN ROUND((v_revenue - v_cost) / v_revenue * 100, 1) ELSE 0 END
  ) INTO r;
  RETURN r;
END $$;

-- ============================================================
-- 4. Huquqlar
-- ============================================================
GRANT EXECUTE ON FUNCTION
  public.win_deal_to_sale(UUID, NUMERIC, NUMERIC, TEXT),
  public.get_deal_detail(UUID)
TO authenticated;

NOTIFY pgrst, 'reload schema';
