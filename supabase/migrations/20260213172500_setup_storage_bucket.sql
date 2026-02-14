-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set Public Read Policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'property-photos' );

-- 3. Set Insert/Delete Policy for Landlords
-- Path structure: landlord_id/property_id/filename.ext
CREATE POLICY "Landlord Manage Own Folder"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Implement 50MB Limit Trigger
CREATE OR REPLACE FUNCTION public.check_property_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  property_path_prefix TEXT;
  current_total_size BIGINT;
  new_file_size BIGINT;
  limit_bytes BIGINT := 50 * 1024 * 1024; -- 50MB
BEGIN
  -- We only care about the property-photos bucket
  IF NEW.bucket_id != 'property-photos' THEN
    RETURN NEW;
  END IF;

  -- Extract path prefix (landlord_id/property_id/)
  -- storage.foldername(name) returns an array like ['landlord_id', 'property_id']
  property_path_prefix := (storage.foldername(NEW.name))[1] || '/' || (storage.foldername(NEW.name))[2] || '/';

  -- Calculate current total size for this property folder
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  INTO current_total_size
  FROM storage.objects
  WHERE bucket_id = 'property-photos'
    AND name LIKE property_path_prefix || '%';

  -- Size of the new file being uploaded
  new_file_size := COALESCE((NEW.metadata->>'size')::bigint, 0);

  IF (current_total_size + new_file_size) > limit_bytes THEN
    RAISE EXCEPTION 'Storage limit exceeded for this property. Max 50MB allowed.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_property_storage_limit
BEFORE INSERT ON storage.objects
FOR EACH ROW
EXECUTE FUNCTION public.check_property_storage_limit();
