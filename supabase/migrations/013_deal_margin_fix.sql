-- ============================================================
-- 013: get_deal_detail — marja tannarxini tuzatish + birlik
-- Muammo 1: tannarx products.average_cost dan olinadi (hech qachon
--   to'ldirilmaydi → $0 → foyda 100% ko'rinadi, XATO va xavfli).
--   Yechim: real FIFO tannarx — partiyalardagi purchase_price.
-- Muammo 2: drawer birlikni ko'rsatishi uchun items'ga unit qo'shamiz.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_deal_detail(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE r JSONB; v_cost NUMERIC := 0; v_revenue NUMERIC := 0; v_item RECORD;
BEGIN
  -- Har mahsulot uchun FIFO bo'yicha taxminiy tannarx hisoblash
  FOR v_item IN
    SELECT di.product_id, di.quantity, di.unit_price
    FROM deal_items di WHERE di.deal_id = p_deal_id
  LOOP
    v_revenue := v_revenue + v_item.quantity * v_item.unit_price;

    -- Tannarx: joriy zaxiradagi eng eski partiyalarning o'rtacha xarid narxi
    -- (agar zaxira bo'lsa), aks holda oxirgi ma'lum xarid narxi
    v_cost := v_cost + v_item.quantity * COALESCE(
      (SELECT purchase_price FROM batches
       WHERE product_id = v_item.product_id AND remaining_quantity > 0
       ORDER BY created_at ASC LIMIT 1),
      (SELECT purchase_price FROM batches
       WHERE product_id = v_item.product_id
       ORDER BY created_at DESC LIMIT 1),
      0
    );
  END LOOP;

  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', di.id, 'product_id', di.product_id,
        'product_name', COALESCE(di.product_name, p.name_uz),
        'quantity', di.quantity, 'unit_price', di.unit_price,
        'line_total', di.quantity * di.unit_price,
        'unit', COALESCE(p.unit, 'm2'),          -- YANGI: birlik
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

GRANT EXECUTE ON FUNCTION public.get_deal_detail(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
