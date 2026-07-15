-- ============================================================
-- 003: SEED — yangi loyiha uchun boshlang'ich ma'lumotlar
-- ============================================================

-- App settings singleton (Settings sahifasi id=1 ni kutadi)
INSERT INTO app_settings (id, store_name, store_phone, store_address)
VALUES (1, 'Tihie Steni', '+998 99 977 84 99', 'Toshkent')
ON CONFLICT (id) DO NOTHING;

-- Boshlang'ich kategoriyalar (biznesga mos: tekstil va profil)
INSERT INTO categories (name_uz, name_ru, name_en) VALUES
  ('Tekstil',  'Текстиль',  'Textile'),
  ('Profil',   'Профиль',   'Profile'),
  ('Aksessuar','Аксессуары','Accessories')
ON CONFLICT DO NOTHING;

-- Eslatma: mahsulotlar, mijozlar, partiyalar — bular real biznes
-- ma'lumoti, ularni ilovaning o'zidan (KP/Inventar/Mijozlar) kiritasiz.
