-- Add missing fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON public.messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Policies
-- Participants (renter, landlord, agent) can view messages
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.properties p ON l.property_id = p.id
    WHERE l.id = messages.lead_id
    AND (
      l.renter_id = auth.uid() OR
      p.landlord_id = auth.uid() OR
      p.agent_id = auth.uid()
    )
  )
);

-- Participants can insert messages
CREATE POLICY "Participants can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.properties p ON l.property_id = p.id
    WHERE l.id = messages.lead_id
    AND (
      l.renter_id = auth.uid() OR
      p.landlord_id = auth.uid() OR
      p.agent_id = auth.uid()
    )
  )
);
