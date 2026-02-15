-- Defensive migration: ensure leads table and lead_status enum exist.
-- Safe to run even if partial state exists from 20260212234500.

-- 1. Create lead_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE public.lead_status AS ENUM (
      'Interested',
      'Contacted',
      'Viewing Scheduled',
      'Lease Sent',
      'Deposit Paid'
    );
  END IF;
END $$;

-- 2. Add enum values that may be missing (safe no-ops)
DO $$
BEGIN
  ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Deposit Paid' AFTER 'Lease Sent';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.lead_status NOT NULL DEFAULT 'Interested',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 4. Enable RLS (idempotent)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 5. Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_renter_id ON public.leads(renter_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- 6. RLS Policies (drop + recreate for idempotency)
DROP POLICY IF EXISTS "Renters can view their own leads" ON public.leads;
CREATE POLICY "Renters can view their own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Renters can create leads" ON public.leads;
CREATE POLICY "Renters can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Landlords and Agents can view leads" ON public.leads;
CREATE POLICY "Landlords and Agents can view leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = leads.property_id
      AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Landlords and Agents can update leads" ON public.leads;
CREATE POLICY "Landlords and Agents can update leads"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = leads.property_id
      AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = leads.property_id
      AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );
