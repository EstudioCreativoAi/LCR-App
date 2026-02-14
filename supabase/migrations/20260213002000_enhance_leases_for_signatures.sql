-- Add envelope_id and financial details to leases table
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS envelope_id TEXT;

-- Update status to include 'sent_for_signature' and 'signed' if not already handled
-- Since it's a TEXT column, we can just use the new status strings.
