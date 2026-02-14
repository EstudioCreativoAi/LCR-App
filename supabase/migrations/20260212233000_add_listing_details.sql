-- Add detailed listing fields to properties table
ALTER TABLE public.properties
ADD COLUMN description TEXT,
ADD COLUMN house_rules TEXT,
ADD COLUMN amenities TEXT[] DEFAULT '{}',
ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Create storage bucket for property photos if it doesn't exist
-- Note: This requires the storage schema to exist (default in Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
-- Allow public access to view photos
CREATE POLICY "Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

-- Allow authenticated landlords to upload photos
CREATE POLICY "Landlord Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- Allow landlords to delete their own photos
CREATE POLICY "Landlord Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');
