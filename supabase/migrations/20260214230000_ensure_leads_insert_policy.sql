-- Belt-and-suspenders: ensure INSERT policy exists on leads table.
-- Also adds a unique constraint to prevent duplicate leads per renter+property.

-- Re-create INSERT policy (idempotent)
DROP POLICY IF EXISTS "Renters can create leads" ON public.leads;
CREATE POLICY "Renters can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

-- Prevent duplicate interest from same renter on same property
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_renter_property_unique
  ON public.leads (renter_id, property_id);
