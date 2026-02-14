-- Create lead status type
CREATE TYPE public.lead_status AS ENUM ('Interested', 'Contacted', 'Viewing Scheduled', 'Lease Sent');

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.lead_status NOT NULL DEFAULT 'Interested',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_leads_property_id ON public.leads(property_id);
CREATE INDEX idx_leads_renter_id ON public.leads(renter_id);
CREATE INDEX idx_leads_status ON public.leads(status);

-- Policies
-- Renters can view their own leads
CREATE POLICY "Renters can view their own leads"
ON public.leads FOR SELECT
USING (auth.uid() = renter_id);

-- Renters can create leads
CREATE POLICY "Renters can create leads"
ON public.leads FOR INSERT
WITH CHECK (auth.uid() = renter_id);

-- Landlords and Agents can view leads for their properties
CREATE POLICY "Landlords and Agents can view leads"
ON public.leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leads.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
);

-- Landlords and Agents can update lead status
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
