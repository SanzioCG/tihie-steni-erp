-- ============================================================
-- 014: PUSH ESLATMA — muddati kelgan vazifalar bo'yicha
--   pg_cron har kuni ertalab get_due_tasks_for_push ni tekshiradi,
--   pg_net orqali send-push-notification edge function'ni chaqiradi.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Xodimга tegishli vazifalarni push uchun tayyorlash
-- get_due_tasks_for_push allaqachon bor (005). Uni push yuboradigan
-- funksiyaga o'raymiz — har xodimга o'z vazifalari.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_task_reminders()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row RECORD;
  v_count INT := 0;
  v_project_url TEXT;
  v_anon_key TEXT;
  v_cron_secret TEXT;
BEGIN
  -- Loyiha URL va service kalitini Supabase Vault'dan olamiz.
  -- (ALTER DATABASE ruxsati yo'q — Vault to'g'ri yo'l.)
  BEGIN
    SELECT decrypted_secret INTO v_project_url
      FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_anon_key
      FROM vault.decrypted_secrets WHERE name = 'service_key';
    -- Cron chaqiruvi uchun maxfiy kalit (edge funksiyadagi CRON_SECRET bilan bir xil).
    -- Bu edge funksiyada user tekshiruvini o'tkazib yuborishga imkon beradi.
    SELECT decrypted_secret INTO v_cron_secret
      FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  EXCEPTION WHEN OTHERS THEN
    v_project_url := NULL;
  END;

  -- Bugungi muddati kelgan, biriktirilgan xodimi bor vazifalar
  FOR v_row IN
    SELECT t.id AS task_id, t.title, t.assigned_to,
           c.full_name AS client_name, c.phone
    FROM client_tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.status = 'pending'
      AND t.due_date::date = CURRENT_DATE
      AND t.assigned_to IS NOT NULL
  LOOP
    -- Har vazifa uchun push (agar pg_net va URL sozlangan bo'lsa)
    IF v_project_url IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key,
          'x-cron-secret', COALESCE(v_cron_secret, '')
        ),
        body := jsonb_build_object(
          'user_id', v_row.assigned_to,
          'title', 'Vazifa eslatmasi',
          'body', v_row.title ||
            COALESCE(' — ' || v_row.client_name, '')
        )
      );
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.dispatch_task_reminders() TO authenticated;

-- ------------------------------------------------------------
-- 2. pg_cron: har kuni ertalab 8:00 (Toshkent) = 3:00 UTC
-- DIQQAT: pg_cron va pg_net yoqilgan bo'lishi shart (Extensions).
-- ------------------------------------------------------------
-- Eski job bo'lsa o'chiramiz (xato bermasin uchun DO blok ichida)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'task-reminders') THEN
    PERFORM cron.unschedule('task-reminders');
  END IF;
END $$;

SELECT cron.schedule('task-reminders', '0 3 * * *',
  'SELECT public.dispatch_task_reminders();');

-- ============================================================
-- SOZLASH (bir marta, qo'lda — Dashboard SQL editor):
-- pg_net funksiyasi loyiha URL va service kalitini bilishi kerak.
-- Quyidagini O'Z qiymatlaringiz bilan bir marta ishga tushiring:
--
-- ALTER DATABASE postgres SET app.settings.project_url =
--   'https://ksmqlkfckbepbwpnnfdf.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_key =
--   '<SERVICE_ROLE_KEY — Settings→API→service_role>';
--
-- Keyin sessiyani yangilash uchun: SELECT pg_reload_conf();
-- (yoki loyihani qayta ulanish. current_setting keyingi cron ishida o'qiydi.)
--
-- DIQQAT: service_role kalit — maxfiy. U faqat bazada qoladi,
-- frontendga chiqmaydi. push edge function uni auth uchun ishlatadi.
--
-- CRON himoyasi: cron chaqiruvi user tekshiruvidan o'tmaydi, shuning uchun
-- x-cron-secret header orqali himoyalanadi. Vault'ga 'cron_secret' qo'shing
-- va AYNAN SHU qiymatni edge funksiya secretiga qo'ying:
--   SELECT vault.create_secret('<TASODIFIY-UZUN-SATR>', 'cron_secret');
--   supabase secrets set CRON_SECRET=<AYNAN SHU SATR>
-- (project_url va service_key ham Vault'da 'project_url' / 'service_key' nomi bilan.)
-- ============================================================

-- Tekshirish (qo'lda sinash):
-- SELECT public.dispatch_task_reminders();  -- nechta push yuborildi
-- SELECT jobname, schedule, active FROM cron.job;
