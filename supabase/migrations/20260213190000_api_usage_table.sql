-- ---------------------------------------------------------------------------
-- API USAGE: Request count table for rate limiting
-- ---------------------------------------------------------------------------

CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);

-- No INSERT/SELECT policies for regular users; rate-limit Edge Function uses
-- service role and bypasses RLS. Table is internal for rate limiting only.
