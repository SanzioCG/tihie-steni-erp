-- ============================================================
-- 002: RPC FUNKSIYALAR (9 ta) — frontend kontraktiga 100% mos
-- Hammasi SECURITY DEFINER + search_path qulflangan + FOR UPDATE
-- ============================================================

-- Yordamchi: audit yozish (user_name'ni auth'dan oladi, klientga ishonmaydi)
CREATE OR REPLACE FUNCTION public.write_audit(
  p_action TEXT, p_entity TEXT, p_details TEXT, p_fallback_name TEXT DEFAULT 'System'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT full_name INTO v_name FROM profiles WHERE id = auth.uid();
  INSERT INTO audit_logs (action, entity, details, description, user_name, created_by)
  VALUES (p_action, p_entity, p_details, p_details, COALESCE(v_name, p_fallback_name), auth.uid());
END $$;

-- ------------------------------------------------------------
-- 1. process_sale_secure_v2 — Multi-item FIFO sotuv (atomik)
-- p_items: [{product_id, total_qty, price, product_name}]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_secure_v2(
  p_client_id UUID,
  p_items JSONB,
  p_total_paid NUMERIC,
  p_user_name TEXT,
  p_debt_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item JSONB;
  v_batch RECORD;
  v_need NUMERIC;
  v_take NUMERIC;
  v_total NUMERIC := 0;
  v_names TEXT := '';
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Savat bo''sh';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_need := (v_item->>'total_qty')::NUMERIC;
    IF v_need <= 0 THEN RAISE EXCEPTION 'Miqdor noto''g''ri: %', v_item->>'product_name'; END IF;

    -- FIFO: eng eski partiyalardan boshlab, qatorlarni qulflab olamiz
    FOR v_batch IN
      SELECT id, remaining_quantity, purchase_price
      FROM batches
      WHERE product_id = (v_item->>'product_id')::UUID
        AND remaining_quantity > 0
      ORDER BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_need <= 0;
      v_take := LEAST(v_need, v_batch.remaining_quantity);

      UPDATE batches
      SET remaining_quantity = remaining_quantity - v_take
      WHERE id = v_batch.id;

      INSERT INTO sales (client_id, product_id, batch_id, quantity,
                         unit_price, cost_price, total_amount, status, created_by)
      VALUES (p_client_id, (v_item->>'product_id')::UUID, v_batch.id, v_take,
              (v_item->>'price')::NUMERIC, v_batch.purchase_price,
              v_take * (v_item->>'price')::NUMERIC, 'completed', auth.uid());

      v_need := v_need - v_take;
    END LOOP;

    IF v_need > 0 THEN
      RAISE EXCEPTION 'Zaxira yetarli emas: % (kam: %)', v_item->>'product_name', v_need;
    END IF;

    v_total := v_total + (v_item->>'total_qty')::NUMERIC * (v_item->>'price')::NUMERIC;
    v_names := v_names || (v_item->>'product_name') || ', ';
  END LOOP;

  -- Kassa: to'langan summa
  IF p_total_paid > 0 THEN
    INSERT INTO transactions (type, amount, category, description, client_id, created_by)
    VALUES ('income', p_total_paid, 'Sotuv',
            'Sotuv: ' || rtrim(v_names, ', '), p_client_id, auth.uid());
  END IF;

  -- Qarz: mijoz balansini kamaytirish (manfiy = qarzdor)
  IF p_debt_amount > 0 AND p_client_id IS NOT NULL THEN
    UPDATE clients SET balance = balance - p_debt_amount WHERE id = p_client_id;
  END IF;

  PERFORM write_audit('SALE', 'SOTUV',
    'Sotuv: ' || rtrim(v_names, ', ') || ' | Jami: $' || v_total ||
    ' | To''landi: $' || p_total_paid || ' | Qarz: $' || p_debt_amount, p_user_name);

  RETURN jsonb_build_object('success', true, 'total', v_total);
END $$;

-- ------------------------------------------------------------
-- 2. process_product_return — Qaytarish (atomik)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_product_return(
  p_sale_id UUID, p_batch_id UUID, p_client_id UUID, p_product_id UUID,
  p_qty NUMERIC, p_refund_amount NUMERIC, p_user_name TEXT,
  p_product_name TEXT, p_category TEXT, p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sotuv topilmadi'; END IF;
  IF p_qty <= 0 OR p_qty > v_sale.quantity THEN
    RAISE EXCEPTION 'Qaytarish miqdori noto''g''ri';
  END IF;

  -- Sotuvdan kamaytirish
  UPDATE sales
  SET quantity = quantity - p_qty,
      total_amount = (quantity - p_qty) * unit_price,
      status = CASE WHEN quantity - p_qty <= 0 THEN 'returned' ELSE 'partial_return' END
  WHERE id = p_sale_id;

  -- Zaxirani qaytarish
  IF p_batch_id IS NOT NULL THEN
    UPDATE batches SET remaining_quantity = remaining_quantity + p_qty
    WHERE id = p_batch_id;
  END IF;

  -- Kassadan chiqim (refund)
  IF p_refund_amount > 0 THEN
    INSERT INTO transactions (type, amount, category, description, client_id, created_by)
    VALUES ('expense', p_refund_amount, COALESCE(p_category, 'Vozvrat'),
            p_description, p_client_id, auth.uid());
  END IF;

  PERFORM write_audit('RETURN', 'SOTUV',
    p_product_name || ' qaytarildi: ' || p_qty || ' | Refund: $' || p_refund_amount, p_user_name);

  RETURN jsonb_build_object('success', true);
END $$;

-- ------------------------------------------------------------
-- 3. collect_debt_secure — Qarz yig'ish (atomik)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collect_debt_secure(
  p_client_id UUID, p_amount NUMERIC, p_user_name TEXT, p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Summa musbat bo''lishi kerak'; END IF;

  UPDATE clients SET balance = balance + p_amount WHERE id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mijoz topilmadi'; END IF;

  INSERT INTO transactions (type, amount, category, description, client_id, created_by)
  VALUES ('income', p_amount, 'Qarz to''lovi', p_description, p_client_id, auth.uid());

  PERFORM write_audit('UPDATED', 'MIJOZ', p_description, p_user_name);
  RETURN jsonb_build_object('success', true);
END $$;

-- ------------------------------------------------------------
-- 4. process_inbound_secure — Yangi kirim (partiya + xarajat)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_inbound_secure(
  p_product_id UUID, p_batch_number TEXT, p_quantity NUMERIC,
  p_purchase_price NUMERIC, p_selling_price NUMERIC, p_min_limit NUMERIC,
  p_user_name TEXT, p_width_m NUMERIC, p_length_m NUMERIC,
  p_color_name TEXT, p_product_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch_id UUID;
BEGIN
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Miqdor musbat bo''lishi kerak'; END IF;

  INSERT INTO batches (product_id, batch_number, quantity, remaining_quantity,
                       purchase_price, selling_price, min_limit, width_m, length_m, color_name)
  VALUES (p_product_id, p_batch_number, p_quantity, p_quantity,
          p_purchase_price, p_selling_price, p_min_limit, p_width_m, p_length_m, p_color_name)
  RETURNING id INTO v_batch_id;

  -- Xarid xarajati kassadan chiqim sifatida
  INSERT INTO transactions (type, amount, category, description, created_by)
  VALUES ('expense', p_quantity * p_purchase_price, 'Tovar xaridi',
          'Kirim: ' || p_product_name || ' (' || p_batch_number || ')', auth.uid());

  PERFORM write_audit('CREATED', 'PARTIYA',
    'Kirim: ' || p_product_name || ' | ' || p_quantity || ' | $' || p_purchase_price, p_user_name);

  RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id);
END $$;

-- ------------------------------------------------------------
-- 5. process_office_expense — Ofis xarajati (atomik)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_office_expense(
  p_title TEXT, p_category TEXT, p_amount NUMERIC, p_user_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Summa musbat bo''lishi kerak'; END IF;

  INSERT INTO office_expenses (title, category, amount, created_by)
  VALUES (p_title, p_category, p_amount, auth.uid());

  INSERT INTO transactions (type, amount, category, description, created_by)
  VALUES ('expense', p_amount, p_category, p_title, auth.uid());

  PERFORM write_audit('CREATED', 'XARAJAT', p_title || ': $' || p_amount, p_user_name);
  RETURN jsonb_build_object('success', true);
END $$;

-- ------------------------------------------------------------
-- 6. get_dashboard_stats — Dashboard KPI'lari
-- Kontrakt: todaySales, todayProfit, cashBalance, inventoryValue,
--           lowStockCount, totalDebt, topClient, topProduct,
--           chartData: [{day, sales}] (oxirgi 7 kun)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  SELECT jsonb_build_object(
    'todaySales',    COALESCE((SELECT SUM(total_amount) FROM sales
                       WHERE created_at::date = CURRENT_DATE AND status <> 'cancelled'), 0),
    'todayProfit',   COALESCE((SELECT SUM((unit_price - cost_price) * quantity) FROM sales
                       WHERE created_at::date = CURRENT_DATE AND status <> 'cancelled'), 0),
    'cashBalance',   COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
                       FROM transactions), 0),
    'inventoryValue',COALESCE((SELECT SUM(remaining_quantity * purchase_price) FROM batches), 0),
    'lowStockCount', (SELECT COUNT(*) FROM batches
                       WHERE remaining_quantity <= COALESCE(min_limit, 0)),
    'totalDebt',     COALESCE((SELECT ABS(SUM(balance)) FROM clients WHERE balance < 0), 0),
    'topClient',     (SELECT c.full_name FROM sales s JOIN clients c ON c.id = s.client_id
                       WHERE s.created_at > NOW() - INTERVAL '30 days'
                       GROUP BY c.full_name ORDER BY SUM(s.total_amount) DESC LIMIT 1),
    'topProduct',    (SELECT p.name_uz FROM sales s JOIN products p ON p.id = s.product_id
                       WHERE s.created_at > NOW() - INTERVAL '30 days'
                       GROUP BY p.name_uz ORDER BY SUM(s.total_amount) DESC LIMIT 1),
    'chartData',     COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', d.day, 'sales', COALESCE(t.total, 0)) ORDER BY d.day)
      FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') AS d(day)
      LEFT JOIN (
        SELECT created_at::date AS day, SUM(total_amount) AS total
        FROM sales WHERE created_at >= CURRENT_DATE - 6 AND status <> 'cancelled'
        GROUP BY 1
      ) t ON t.day = d.day
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ------------------------------------------------------------
-- 7. get_finance_stats_v2 — Moliya sahifasi
-- Kontrakt: balance, totalExpense, grossProfit, netProfit, profitMargin,
--           chartData [{name, income, expense}], categoryData [{name, value}],
--           recentTransactions [tx...]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_finance_stats_v2(
  p_category TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_from TIMESTAMPTZ := COALESCE(p_date_from::timestamptz, NOW() - INTERVAL '30 days');
  v_to   TIMESTAMPTZ := COALESCE(p_date_to::timestamptz, NOW());
  v_income NUMERIC; v_expense NUMERIC; v_gross NUMERIC;
  r JSONB;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type='income'), 0),
         COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0)
  INTO v_income, v_expense
  FROM transactions
  WHERE created_at BETWEEN v_from AND v_to
    AND (p_category IS NULL OR category = p_category);

  SELECT COALESCE(SUM((unit_price - cost_price) * quantity), 0) INTO v_gross
  FROM sales WHERE created_at BETWEEN v_from AND v_to AND status <> 'cancelled';

  SELECT jsonb_build_object(
    'balance',      v_income - v_expense,
    'totalExpense', v_expense,
    'grossProfit',  v_gross,
    'netProfit',    v_income - v_expense,
    'profitMargin', CASE WHEN v_income > 0 THEN ROUND((v_income - v_expense) / v_income * 100, 1) ELSE 0 END,
    'chartData', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', to_char(d.day, 'DD.MM'),
        'income',  COALESCE(t.inc, 0),
        'expense', COALESCE(t.exp, 0)) ORDER BY d.day)
      FROM generate_series(v_from::date, v_to::date, '1 day') AS d(day)
      LEFT JOIN (
        SELECT created_at::date AS day,
               SUM(amount) FILTER (WHERE type='income')  AS inc,
               SUM(amount) FILTER (WHERE type='expense') AS exp
        FROM transactions
        WHERE created_at BETWEEN v_from AND v_to
          AND (p_category IS NULL OR category = p_category)
        GROUP BY 1
      ) t ON t.day = d.day
    ), '[]'::jsonb),
    'categoryData', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', category, 'value', total) ORDER BY total DESC)
      FROM (
        SELECT category, SUM(amount) AS total FROM transactions
        WHERE type = 'expense' AND created_at BETWEEN v_from AND v_to
        GROUP BY category LIMIT 8
      ) c
    ), '[]'::jsonb),
    'recentTransactions', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT id, type, amount, category, description, created_at
        FROM transactions
        WHERE created_at BETWEEN v_from AND v_to
          AND (p_category IS NULL OR category = p_category)
        ORDER BY created_at DESC LIMIT 20
      ) t
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ------------------------------------------------------------
-- 8. get_daily_z_report — Bugungi Z-hisobot
-- Kontrakt: total_sales, returns, expenses, debt_given, cash_in_hand
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_daily_z_report()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM sales
                     WHERE created_at::date = CURRENT_DATE AND status <> 'cancelled'), 0),
    'returns',     COALESCE((SELECT SUM(amount) FROM transactions
                     WHERE type='expense' AND category ILIKE '%vozvrat%'
                       AND created_at::date = CURRENT_DATE), 0),
    'expenses',    COALESCE((SELECT SUM(amount) FROM transactions
                     WHERE type='expense' AND category NOT ILIKE '%vozvrat%'
                       AND created_at::date = CURRENT_DATE), 0),
    'debt_given',  COALESCE((SELECT SUM(s.total_amount) FROM sales s
                     WHERE s.created_at::date = CURRENT_DATE), 0)
                   - COALESCE((SELECT SUM(amount) FROM transactions
                     WHERE type='income' AND category='Sotuv'
                       AND created_at::date = CURRENT_DATE), 0),
    'cash_in_hand', COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
                     FROM transactions WHERE created_at::date = CURRENT_DATE), 0)
  ) INTO r;
  RETURN r;
END $$;

-- ------------------------------------------------------------
-- 9. get_client_summary — Mijoz tarixi
-- Kontrakt: stats {grossSales, netRevenue, returnsTotal, balance,
--                  salesCount, avgCheck, topProduct},
--           timeline [{id, event_type, title, amount, status, created_at}]
-- ------------------------------------------------------------
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
                        GROUP BY p.name_uz ORDER BY SUM(s.total_amount) DESC LIMIT 1)
    ),
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
        LIMIT 50
      ) x
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- ------------------------------------------------------------
-- Huquqlar: RPC'larni faqat authenticated chaqira oladi
-- ------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.process_sale_secure_v2(UUID, JSONB, NUMERIC, TEXT, NUMERIC),
  public.process_product_return(UUID, UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT),
  public.collect_debt_secure(UUID, NUMERIC, TEXT, TEXT),
  public.process_inbound_secure(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, TEXT),
  public.process_office_expense(TEXT, TEXT, NUMERIC, TEXT),
  public.get_dashboard_stats(),
  public.get_finance_stats_v2(TEXT, TEXT, TEXT),
  public.get_daily_z_report(),
  public.get_client_summary(UUID),
  public.current_role()
TO authenticated;
