-------------------------------------------------------------------------------
-- PROFILES: INSERT policy
-- The handle_new_user() trigger runs as SECURITY DEFINER and bypasses RLS,
-- so normal sign-up works without this. This policy covers the explicit
-- client-side upsert path during sign-up as a safety net.
-------------------------------------------------------------------------------
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-------------------------------------------------------------------------------
-- LEASES: INSERT / UPDATE / DELETE policies
-- These were missing from the initial security migration.
-------------------------------------------------------------------------------

-- Renters can create a lease request for any active property
CREATE POLICY "Renters can create lease requests"
ON public.leases FOR INSERT
WITH CHECK (
  auth.uid() = renter_id AND
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND p.status = 'active'
  )
);

-- Renters can update their own pending leases (e.g. cancel before acceptance);
-- Landlords/agents can update leases for their properties (e.g. approve/reject)
CREATE POLICY "Involved parties can update leases"
ON public.leases FOR UPDATE
USING (
  auth.uid() = renter_id OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = renter_id OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
);

-- Only landlords/agents can delete lease records
CREATE POLICY "Landlords and agents can delete leases"
ON public.leases FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
);
