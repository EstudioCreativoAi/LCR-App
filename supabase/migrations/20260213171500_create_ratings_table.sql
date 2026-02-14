-- Create ratings table
CREATE TYPE public.rating_category AS ENUM ('property', 'renter');

CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.rating_category NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_ratings_property_id ON public.ratings(property_id);
CREATE INDEX idx_ratings_renter_id ON public.ratings(renter_id);
CREATE INDEX idx_ratings_category ON public.ratings(category);

-- Policies
CREATE POLICY "Ratings are viewable by everyone"
ON public.ratings FOR SELECT
USING (true);

CREATE POLICY "Users can create ratings if they were part of a lease"
ON public.ratings FOR INSERT
WITH CHECK (
  auth.uid() = rater_id AND
  EXISTS (
    SELECT 1 FROM public.leases l
    WHERE (l.property_id = ratings.property_id AND l.renter_id = ratings.renter_id)
    AND l.status = 'completed'
    AND (
      (ratings.category = 'property' AND l.renter_id = auth.uid()) OR
      (ratings.category = 'renter' AND EXISTS (
        SELECT 1 FROM public.properties p 
        WHERE p.id = l.property_id AND (p.landlord_id = auth.uid() OR p.agent_id = auth.uid())
      ))
    )
  )
);
