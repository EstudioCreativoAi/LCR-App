-- Ensure lease financial columns exist (original migration may have been skipped).
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS envelope_id TEXT;
