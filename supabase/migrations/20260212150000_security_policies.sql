-- Create leases table (required for RLS policy)
CREATE TABLE public.leases (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- Enable RLS for leases
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- PROFILES POLICIES
-------------------------------------------------------------------------------

-- Policy 1: Public Read Access
-- Allow authenticated users to view profiles (e.g. to see landlord/agent info)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Policy 2: Update Own Profile
-- Users can only update their own profile data
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-------------------------------------------------------------------------------
-- PROPERTIES POLICIES
-------------------------------------------------------------------------------

-- Policy 1: Public View Active + Owner/Agent View All
-- Everyone can see 'active' listings.
-- Landlords and Agents can see all their own listings (active or otherwise).
CREATE POLICY "Public view active, Owners view all"
ON public.properties FOR SELECT
USING (
  status = 'active' OR 
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

-- Policy 2: Insert (Landlord or Agent)
CREATE POLICY "Landlords and agents can insert properties"
ON public.properties FOR INSERT
WITH CHECK (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

-- Policy 3: Update (Landlord or Agent)
CREATE POLICY "Landlords and agents can update properties"
ON public.properties FOR UPDATE
USING (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
)
WITH CHECK (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

-- Policy 4: Delete (Landlord or Agent)
CREATE POLICY "Landlords and agents can delete properties"
ON public.properties FOR DELETE
USING (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

-------------------------------------------------------------------------------
-- LEASES POLICIES
-------------------------------------------------------------------------------

-- Policy 1: View Leases (Renter, Landlord, or Agent)
CREATE POLICY "Involved parties can view leases"
ON public.leases FOR SELECT
USING (
  -- The viewer is the renter
  auth.uid() = renter_id OR
  -- The viewer is the landlord or agent of the associated property
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
);
