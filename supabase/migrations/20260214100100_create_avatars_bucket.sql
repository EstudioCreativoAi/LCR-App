-- Create avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for all avatars
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can only manage files in their own folder: {user_id}/*
CREATE POLICY "Users Manage Own Avatar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
