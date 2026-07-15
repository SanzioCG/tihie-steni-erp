-- ============================================================
-- 007: PRODUCTS jadvali tuzatishlari
-- Muammo: reverse-engineering paytida ikki nomuvofiqlik qolgan edi.
-- Xato: "Could not find the 'min_stock' column of 'products'"
-- ============================================================

-- ---------- 1. min_stock ustuni ----------
-- AddProductModal.tsx mahsulot darajasida minimal zaxira yuboradi
-- (batches.min_limit — partiya darajasида, bu esa mahsulot darajasида)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;

-- ---------- 2. unit — NOT NULL ni olib tashlash ----------
-- AddProductModal `unit` yubormaydi. Ilovada o'lchov birligi kategoriyadan
-- aniqlanadi (KP.tsx: isTekstil ? 'm²' : 'm'), mahsulotda saqlanmaydi.
-- NOT NULL qoldirilsa INSERT xato beradi.
ALTER TABLE products
  ALTER COLUMN unit DROP NOT NULL;

ALTER TABLE products
  ALTER COLUMN unit SET DEFAULT 'm2';

-- Mavjud NULL qiymatlarni to'ldirish (agar bo'lsa)
UPDATE products SET unit = 'm2' WHERE unit IS NULL;

-- ---------- 3. PostgREST schema keshini yangilash ----------
-- DDL o'zgarishidan keyin kesh yangilanmasa, "column not found in schema cache"
-- xatosi davom etadi. Bu buyruq keshni majburan yangilaydi.
NOTIFY pgrst, 'reload schema';

-- ---------- Tekshirish ----------
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'products' ORDER BY ordinal_position;
