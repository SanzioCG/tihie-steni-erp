-- 015: Realtime — client_messages jonli yangilanishi (ichki chat uchun)
-- deals allaqachon supabase_realtime publication'da
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_messages;
  END IF;
END $$;