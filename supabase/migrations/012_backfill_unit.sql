-- 012_backfill_unit.sql
-- ============================================================================
-- Mahsulot birligini bir marta to'g'rilash.
--
-- 007 migratsiyasi `products.unit` uchun DEFAULT 'm2' qo'ygan va barcha mavjud
-- qatorларни 'm2' qilган edi. Natijada chiziqli (profil) mahsulotlar ham xato
-- 'm2' bo'lиб qoldi. Endi frontend (AddProductModal) birlikни o'zi yozadi va
-- ilova product.unit'ни o'qийди — kategoriyadan TAXMIN qilinmaydi.
--
-- Bu skript mavjud ma'lumotни kategoriyaga qarab to'g'rilaydi:
--   tekstil kategoriya  -> 'm2'  (o'zgarmaydi)
--   boshqa kategoriyalar -> 'p.m'
--
-- Faqat hali ham default holatda ('m2') qolган qatorларга tegamиз. Foydalanuvchi
-- qo'лда tanlaган ('p.m' yoki 'pcs') qiymatlar saqlanadi.
-- ============================================================================

UPDATE products p
SET unit = 'p.m'
FROM categories c
WHERE p.category_id = c.id
  AND p.unit = 'm2'
  AND lower(c.name_uz) NOT LIKE '%tekstil%';

-- Eslatma: 'dona' (pcs) mahsulotларни kategoriya nomидан ishonchli aniqлаб
-- bo'lmaydi — ular AddProductModal orqали qo'лда 'pcs' qiliб belgilanadi.
