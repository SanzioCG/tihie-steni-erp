-- ============================================================
-- 011: IQTISODIY ANALITIKA
--   * Qarz yoshi (aging 0-30/31-60/61-90/90+)
--   * ABC tahlil (Pareto)
--   * Vaznli prognoz (weighted pipeline)
--   * O'lik zaxira (dead stock)
--   * Zaxira aylanuvchanligi
-- ============================================================

-- ============================================================
-- 1. QARZ YOSHI (Receivables Aging)
-- Qarzning necha kunligi — 90+ kun deyarli yo'qotilgan pul.
-- Yosh = oxirgi sotuv sanasidan hisoblanadi (qarz o'shanda paydo bo'lgan).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_debt_aging()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  WITH debtors AS (
    SELECT c.id, c.full_name, c.phone, c.kind,
           ABS(c.balance) AS debt,
           EXTRACT(DAY FROM NOW() - COALESCE(
             (SELECT MAX(created_at) FROM sales s WHERE s.client_id = c.id),
             c.created_at))::INT AS age_days
    FROM clients c
    WHERE c.balance < 0
  )
  SELECT jsonb_build_object(
    'buckets', jsonb_build_object(
      'd0_30',  COALESCE(SUM(debt) FILTER (WHERE age_days <= 30), 0),
      'd31_60', COALESCE(SUM(debt) FILTER (WHERE age_days BETWEEN 31 AND 60), 0),
      'd61_90', COALESCE(SUM(debt) FILTER (WHERE age_days BETWEEN 61 AND 90), 0),
      'd90_plus', COALESCE(SUM(debt) FILTER (WHERE age_days > 90), 0)
    ),
    'total_debt', COALESCE(SUM(debt), 0),
    'at_risk', COALESCE(SUM(debt) FILTER (WHERE age_days > 90), 0),  -- xavfli
    'debtors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', full_name, 'phone', phone, 'kind', kind,
        'debt', debt, 'age_days', age_days,
        'bucket', CASE WHEN age_days <= 30 THEN '0-30'
                       WHEN age_days <= 60 THEN '31-60'
                       WHEN age_days <= 90 THEN '61-90'
                       ELSE '90+' END
      ) ORDER BY age_days DESC)
      FROM debtors
    ), '[]'::jsonb)
  ) INTO r FROM debtors;
  RETURN COALESCE(r, jsonb_build_object('buckets', '{}'::jsonb, 'total_debt', 0,
    'at_risk', 0, 'debtors', '[]'::jsonb));
END $$;

-- ============================================================
-- 2. ABC TAHLIL (Pareto — 20% mijoz 80% aylanma)
-- A: aylanmaning 80% ini beruvchi mijozlar
-- B: keyingi 15%, C: oxirgi 5%
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_abc_analysis()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  WITH client_rev AS (
    SELECT c.id, c.full_name, c.kind,
           COALESCE(SUM(s.total_amount), 0) AS revenue
    FROM clients c
    LEFT JOIN sales s ON s.client_id = c.id AND s.status <> 'cancelled'
    GROUP BY c.id, c.full_name, c.kind
    HAVING COALESCE(SUM(s.total_amount), 0) > 0
  ),
  ranked AS (
    SELECT *,
      SUM(revenue) OVER () AS total_rev,
      SUM(revenue) OVER (ORDER BY revenue DESC) AS running
    FROM client_rev
  ),
  classed AS (
    SELECT id, full_name, kind, revenue,
      CASE
        WHEN total_rev = 0 THEN 'C'
        WHEN running / total_rev <= 0.80 THEN 'A'
        WHEN running / total_rev <= 0.95 THEN 'B'
        ELSE 'C'
      END AS abc
    FROM ranked
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'A_count', COUNT(*) FILTER (WHERE abc='A'),
      'A_revenue', COALESCE(SUM(revenue) FILTER (WHERE abc='A'), 0),
      'B_count', COUNT(*) FILTER (WHERE abc='B'),
      'B_revenue', COALESCE(SUM(revenue) FILTER (WHERE abc='B'), 0),
      'C_count', COUNT(*) FILTER (WHERE abc='C'),
      'C_revenue', COALESCE(SUM(revenue) FILTER (WHERE abc='C'), 0)
    ),
    'clients', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', full_name, 'kind', kind,
        'revenue', revenue, 'class', abc) ORDER BY revenue DESC)
      FROM classed
    ), '[]'::jsonb)
  ) INTO r FROM classed;
  RETURN COALESCE(r, jsonb_build_object('summary','{}'::jsonb,'clients','[]'::jsonb));
END $$;

-- ============================================================
-- 3. VAZNLI PROGNOZ (Weighted Pipeline)
-- SUM(expected_amount × probability/100) — "kelasi oy qancha kutamiz"
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_weighted_forecast()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'weighted_total', COALESCE(SUM(expected_amount * probability / 100.0), 0),
    'gross_total', COALESCE(SUM(expected_amount), 0),
    'open_deals', COUNT(*),
    'by_stage', COALESCE((
      SELECT jsonb_object_agg(stage, jsonb_build_object(
        'count', cnt, 'gross', gross, 'weighted', weighted))
      FROM (
        SELECT stage, COUNT(*) cnt, SUM(expected_amount) gross,
               SUM(expected_amount * probability / 100.0) weighted
        FROM deals WHERE stage NOT IN ('won','lost')
        GROUP BY stage
      ) s
    ), '{}'::jsonb),
    'expected_this_month', COALESCE((
      SELECT SUM(expected_amount * probability / 100.0)
      FROM deals
      WHERE stage NOT IN ('won','lost')
        AND expected_close_date <= (date_trunc('month', NOW()) + INTERVAL '1 month')::date
    ), 0)
  )
  FROM deals WHERE stage NOT IN ('won','lost');
$$;

-- ============================================================
-- 4. O'LIK ZAXIRA (Dead Stock)
-- N kundan beri sotilmagan zaxira — muzlagan kapital.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dead_stock(p_days INT DEFAULT 60)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  WITH product_activity AS (
    SELECT p.id, p.name_uz, p.sku,
      COALESCE(SUM(b.remaining_quantity), 0) AS stock_qty,
      COALESCE(SUM(b.remaining_quantity * b.purchase_price), 0) AS frozen_value,
      (SELECT MAX(s.created_at) FROM sales s WHERE s.product_id = p.id) AS last_sold
    FROM products p
    LEFT JOIN batches b ON b.product_id = p.id AND b.remaining_quantity > 0
    GROUP BY p.id, p.name_uz, p.sku
    HAVING COALESCE(SUM(b.remaining_quantity), 0) > 0
  )
  SELECT jsonb_build_object(
    'total_frozen', COALESCE(SUM(frozen_value) FILTER (
      WHERE last_sold IS NULL OR last_sold < NOW() - (p_days || ' days')::interval), 0),
    'dead_count', COUNT(*) FILTER (
      WHERE last_sold IS NULL OR last_sold < NOW() - (p_days || ' days')::interval),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', name_uz, 'sku', sku,
        'stock_qty', stock_qty, 'frozen_value', frozen_value,
        'days_since_sale', CASE WHEN last_sold IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM NOW() - last_sold)::INT END,
        'never_sold', last_sold IS NULL
      ) ORDER BY frozen_value DESC)
      FROM product_activity
      WHERE last_sold IS NULL OR last_sold < NOW() - (p_days || ' days')::interval
    ), '[]'::jsonb)
  ) INTO r FROM product_activity;
  RETURN COALESCE(r, jsonb_build_object('total_frozen',0,'dead_count',0,'items','[]'::jsonb));
END $$;

-- ============================================================
-- 5. Huquqlar
-- ============================================================
GRANT EXECUTE ON FUNCTION
  public.get_debt_aging(),
  public.get_abc_analysis(),
  public.get_weighted_forecast(),
  public.get_dead_stock(INT)
TO authenticated;

NOTIFY pgrst, 'reload schema';
