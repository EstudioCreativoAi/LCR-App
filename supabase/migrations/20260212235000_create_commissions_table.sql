-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_mxn NUMERIC(12, 2) NOT NULL CHECK (amount_mxn >= 0),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_commissions_agent_id ON public.commissions(agent_id);
CREATE INDEX idx_commissions_lease_id ON public.commissions(lease_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);

-- Policies
-- Agents can view their own commissions
CREATE POLICY "Agents can view their own commissions"
ON public.commissions FOR SELECT
USING (auth.uid() = agent_id);

-- Landlords can view commissions for their leases
CREATE POLICY "Landlords can view commissions for their leases"
ON public.commissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.properties p ON l.property_id = p.id
    WHERE l.id = commissions.lease_id
    AND p.landlord_id = auth.uid()
  )
);
