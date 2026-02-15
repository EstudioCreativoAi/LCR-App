-- Ensure listing detail columns exist on properties table.
-- The original migration 20260212233000 may have been skipped or failed.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS house_rules TEXT,
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop + recreate for idempotency)
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
CREATE POLICY "Public Read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Landlord Upload" ON storage.objects;
CREATE POLICY "Landlord Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Landlord Delete" ON storage.objects;
CREATE POLICY "Landlord Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos');
