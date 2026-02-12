-- ---------------------------------------------------------------------------
-- RESET SCRIPT
-- WARNING: This will delete all data in 'leases', 'properties', and 'profiles'.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.leases;
DROP TABLE IF EXISTS public.properties;
DROP TABLE IF EXISTS public.profiles;

DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.property_status;

-- ---------------------------------------------------------------------------
-- RE-CREATE TABLES & TYPES
-- ---------------------------------------------------------------------------

-- 1. Create custom types
CREATE TYPE public.user_role AS ENUM ('renter', 'landlord', 'agent');
CREATE TYPE public.property_status AS ENUM ('active', 'rented', 'paused');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'renter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  property_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
  bathrooms NUMERIC(3, 1) NOT NULL CHECK (bathrooms >= 0),
  monthly_rent_mxn NUMERIC(12, 2) NOT NULL CHECK (monthly_rent_mxn >= 0),
  status public.property_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 4. Create leases table
CREATE TABLE public.leases (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- 5. Create indexes
CREATE INDEX idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX idx_properties_agent_id ON public.properties(agent_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_city ON public.properties(city);

-- ---------------------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'renter'); -- Default role
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------------------

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Properties
CREATE POLICY "Public view active, Owners view all"
ON public.properties FOR SELECT
USING (
  status = 'active' OR 
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

CREATE POLICY "Landlords and agents can insert properties"
ON public.properties FOR INSERT
WITH CHECK (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

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

CREATE POLICY "Landlords and agents can delete properties"
ON public.properties FOR DELETE
USING (
  auth.uid() = landlord_id OR 
  auth.uid() = agent_id
);

-- Leases
CREATE POLICY "Involved parties can view leases"
ON public.leases FOR SELECT
USING (
  auth.uid() = renter_id OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leases.property_id
    AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
  )
);
