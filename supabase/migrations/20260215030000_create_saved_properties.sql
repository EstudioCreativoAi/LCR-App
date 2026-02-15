-- Create saved_properties table for renter wishlists
create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_properties_user_property_unique unique (user_id, property_id)
);

-- Enable RLS
alter table public.saved_properties enable row level security;

-- Users can read their own saved properties
create policy "Users can view own saved properties"
  on public.saved_properties for select
  using (auth.uid() = user_id);

-- Users can save properties
create policy "Users can save properties"
  on public.saved_properties for insert
  with check (auth.uid() = user_id);

-- Users can unsave properties
create policy "Users can unsave properties"
  on public.saved_properties for delete
  using (auth.uid() = user_id);
