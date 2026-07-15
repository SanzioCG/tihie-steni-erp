-- ============================================================
-- 006: STORAGE BUCKETLAR
-- Muammo: yangi loyihada bucket'lar yo'q edi → rasm yuklash ishlamayapti.
-- AddProductModal.tsx: BUCKET_NAME = 'products'
-- 005_crm_advanced.sql: client_files → 'client-files'
-- ============================================================

-- ---------- 1. PRODUCTS (mahsulot rasmlari — public) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Hamma o'qiy oladi (public bucket — getPublicUrl ishlashi uchun)
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
CREATE POLICY "products_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'products');

-- Yuklash — faqat authenticated
DROP POLICY IF EXISTS "products_auth_insert" ON storage.objects;
CREATE POLICY "products_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products');

-- Yangilash / o'chirish — faqat authenticated
DROP POLICY IF EXISTS "products_auth_update" ON storage.objects;
CREATE POLICY "products_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "products_auth_delete" ON storage.objects;
CREATE POLICY "products_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'products');

-- ---------- 2. CLIENT-FILES (mijoz hujjatlari — PRIVATE) ----------
-- Chizma, shartnoma, xona rasmlari. Public EMAS — signed URL orqali ochiladi.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-files', 'client-files', false, 20971520)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_files_auth_read" ON storage.objects;
CREATE POLICY "client_files_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-files');

DROP POLICY IF EXISTS "client_files_auth_insert" ON storage.objects;
CREATE POLICY "client_files_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files');

DROP POLICY IF EXISTS "client_files_auth_delete" ON storage.objects;
CREATE POLICY "client_files_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-files');

-- ---------- 3. AVATARS (profil rasmlari — public) ----------
-- profiles.avatar_url uchun. Hozir UI'da yo'q, lekin type'da bor — tayyorlab qo'yamiz.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Har kim faqat o'z avatarini yuklaydi (fayl nomi user_id bilan boshlansin)
DROP POLICY IF EXISTS "avatars_own_insert" ON storage.objects;
CREATE POLICY "avatars_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
CREATE POLICY "avatars_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- ---------- Tekshirish ----------
-- SELECT id, name, public FROM storage.buckets;
