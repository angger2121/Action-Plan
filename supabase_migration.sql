-- 1. Buat Tabel Database
CREATE TABLE IF NOT EXISTS actionplan_db (
  id text PRIMARY KEY,
  value text
);

-- 2. Aktifkan Realtime untuk tabel ini
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'actionplan_db'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE actionplan_db;
  END IF;
END $$;

-- 3. Buat Bucket Storage untuk PDF (training_reports)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training_reports', 'training_reports', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Matikan RLS sementara (untuk kemudahan akses public/prototype)
ALTER TABLE actionplan_db DISABLE ROW LEVEL SECURITY;

-- 5. Buat Storage Policy agar file PDF bisa diakses & diunggah oleh publik
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'training_reports');
