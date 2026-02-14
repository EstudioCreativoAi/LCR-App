-- Create payments table for tracking deposit and rent payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  lead_id UUID,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_mxn NUMERIC(12, 2) NOT NULL CHECK (amount_mxn > 0),
  payment_type TEXT NOT NULL DEFAULT 'deposit',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payers can view their own payments
CREATE POLICY "Payers can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = payer_id);

-- Recipients can view payments sent to them
CREATE POLICY "Recipients can view received payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = recipient_id);

-- Service role can insert/update (Edge Functions use service role)
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- Add 'Deposit Paid' to lead_status enum (safe no-op if enum or value doesn't exist)
DO $$
BEGIN
  ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Deposit Paid' AFTER 'Lease Sent';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Indexes for common queries
CREATE INDEX idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
