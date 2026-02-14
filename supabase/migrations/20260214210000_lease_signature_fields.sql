-- Add signature and document fields to leases
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Create leases storage bucket for signed PDFs and signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('leases', 'leases', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read lease documents
CREATE POLICY "Authenticated users can read lease documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'leases' AND auth.role() = 'authenticated');

-- Authenticated users can upload lease documents
CREATE POLICY "Authenticated users can upload lease documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'leases' AND auth.role() = 'authenticated');

-- Authenticated users can update lease documents
CREATE POLICY "Authenticated users can update lease documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'leases' AND auth.role() = 'authenticated');
