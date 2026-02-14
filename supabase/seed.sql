-- =============================================================================
-- LCR App — Seed Data  (Los Cabos Rental Marketplace)
-- Run via: supabase db reset  OR  psql -f supabase/seed.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------

-- Silence the auto-profile trigger so we can insert profiles manually with
-- the correct roles and metadata.
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- ---------------------------------------------------------------------------
-- 1. Auth Users  (9 total: 3 renters, 3 landlords, 3 agents)
-- ---------------------------------------------------------------------------
-- Passwords are all: TestPass123!
-- bcrypt hash generated with cost factor 10.
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  -- ── Renters ────────────────────────────────────────────────────────────────
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sofia.ramirez@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'james.walker@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'elena.morales@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),

  -- ── Landlords ──────────────────────────────────────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'carlos.mendoza@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'patricia.villa@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'roberto.castillo@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),

  -- ── Agents ─────────────────────────────────────────────────────────────────
  (
    'cccccccc-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'diana.reyes@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'miguel.torres@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'laura.fuentes@example.com',
    '$2a$10$PgnmBEj6P4g9UMjB2c5SYO.xd1hRqnRqnRqnRqnRqnRqnRqnRqnRq',
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW()
  );

-- ---------------------------------------------------------------------------
-- 2. Profiles
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (id, role, full_name, avatar_url, created_at, updated_at) VALUES

  -- ── Renters ────────────────────────────────────────────────────────────────
  (
    'aaaaaaaa-0000-0000-0000-000000000001', 'renter',
    'Sofía Ramírez',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002', 'renter',
    'James Walker',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003', 'renter',
    'Elena Morales',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    NOW(), NOW()
  ),

  -- ── Landlords ──────────────────────────────────────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000001', 'landlord',
    'Carlos Mendoza',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002', 'landlord',
    'Patricia Villa',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003', 'landlord',
    'Roberto Castillo',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    NOW(), NOW()
  ),

  -- ── Agents ─────────────────────────────────────────────────────────────────
  (
    'cccccccc-0000-0000-0000-000000000001', 'agent',
    'Diana Reyes',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'cccccccc-0000-0000-0000-000000000002', 'agent',
    'Miguel Torres',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    NOW(), NOW()
  ),
  (
    'cccccccc-0000-0000-0000-000000000003', 'agent',
    'Laura Fuentes',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    NOW(), NOW()
  );

-- Re-enable the trigger for future real sign-ups
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ---------------------------------------------------------------------------
-- 3. Properties  (10 listings)
--    4 × Cabo San Lucas | 3 × San José del Cabo | 3 × The Corridor
-- ---------------------------------------------------------------------------

INSERT INTO public.properties (
  id, landlord_id, agent_id,
  address, city, latitude, longitude,
  property_type, bedrooms, bathrooms, monthly_rent_mxn,
  status, available_from,
  description, house_rules, amenities, photos
) VALUES

  -- ── Cabo San Lucas — 4 listings ───────────────────────────────────────────

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000001',   -- Carlos Mendoza (landlord)
    'cccccccc-0000-0000-0000-000000000001',   -- Diana Reyes (agent)
    'Pedregal de Cabo San Lucas, Calle Farallón 12',
    'Cabo San Lucas',
    22.8851, -109.9085,
    'Villa', 4, 4.5, 58000.00,
    'active', CURRENT_DATE,
    'Spectacular hillside villa in the exclusive Pedregal neighborhood with panoramic views of El Arco and the Sea of Cortez. Designed by a local architect using natural stone and tropical hardwoods, this property blends seamlessly with its dramatic cliff-side setting.',
    'No smoking indoors. Pets allowed with prior approval. No parties exceeding 20 guests.',
    ARRAY['Ocean View', 'Private Pool', 'High-Speed WiFi', 'Air Conditioning', 'Fully Equipped Kitchen', 'Concierge Service', 'Covered Parking', 'Smart Home System'],
    ARRAY[
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000001',   -- Carlos Mendoza
    NULL,
    'Colonia El Medano, Calle Playa Grande 7',
    'Cabo San Lucas',
    22.8892, -109.9034,
    'Penthouse', 3, 3.0, 42000.00,
    'active', CURRENT_DATE,
    'Beachfront penthouse steps from Playa El Médano. Floor-to-ceiling glass walls flood the open-plan living area with natural light and frame unobstructed Pacific sunset views. Private rooftop terrace with jacuzzi included.',
    'No smoking. No pets. Quiet hours after 10 PM.',
    ARRAY['Beachfront', 'Ocean View', 'Rooftop Jacuzzi', 'High-Speed WiFi', 'Air Conditioning', 'Smart TV', 'Gym Access', 'Concierge Service'],
    ARRAY[
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000002',   -- Patricia Villa
    'cccccccc-0000-0000-0000-000000000002',   -- Miguel Torres
    'Marina Golden Zone, Blvd. Marina 345 Piso 8',
    'Cabo San Lucas',
    22.8906, -109.9162,
    'Condo', 2, 2.0, 28500.00,
    'active', CURRENT_DATE,
    'Modern condo in the heart of the Marina Golden Zone. Walk to world-class restaurants, boutique shops, and water-sport tours. The split-bedroom layout offers privacy for couples or small families.',
    'No parties. Maximum 4 occupants. No smoking anywhere on property.',
    ARRAY['Marina View', 'High-Speed WiFi', 'Air Conditioning', 'Fully Equipped Kitchen', 'Gym Access', 'Pool Access', 'Covered Parking', 'In-Unit Washer/Dryer'],
    ARRAY[
      'https://images.unsplash.com/photo-1560185127-6c76c4b2d4b8?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1527030280862-64139fba04ca?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000003',   -- Roberto Castillo
    NULL,
    'Fraccionamiento Misiones del Cabo, Casa 22',
    'Cabo San Lucas',
    22.9011, -109.9398,
    'House', 1, 1.0, 15000.00,
    'active', CURRENT_DATE,
    'Cozy single-bedroom casa in a quiet gated community 10 minutes from downtown Cabo. Ideal for a professional relocating solo or a couple seeking an affordable base. Private garden patio with BBQ.',
    'No smoking. Small pets considered. No more than 2 occupants.',
    ARRAY['Garden Patio', 'BBQ Grill', 'High-Speed WiFi', 'Air Conditioning', 'Covered Parking', 'Gated Community'],
    ARRAY[
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  -- ── San José del Cabo — 3 listings ────────────────────────────────────────

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000002',   -- Patricia Villa
    'cccccccc-0000-0000-0000-000000000001',   -- Diana Reyes
    'Club de Golf Fonatur, Paseo Finisterra 88',
    'San José del Cabo',
    23.0554, -109.6945,
    'Villa', 4, 4.0, 55000.00,
    'active', CURRENT_DATE,
    'Award-winning contemporary villa on the fairway of the Fonatur Golf Course. Featuring an infinity pool that merges visually with the Sea of Cortez beyond the 18th hole. Chef''s kitchen, media room, and separate casita for guests.',
    'No smoking indoors. No loud music after 11 PM. Pets on request.',
    ARRAY['Golf Course View', 'Infinity Pool', 'Private Pool', 'High-Speed WiFi', 'Air Conditioning', 'Chef''s Kitchen', 'Media Room', 'Guest Casita', 'Covered Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000003',   -- Roberto Castillo
    'cccccccc-0000-0000-0000-000000000003',   -- Laura Fuentes
    'Zona Hotelera, Paseo San José 210 Torre B',
    'San José del Cabo',
    23.0598, -109.7112,
    'Condo', 2, 2.0, 24000.00,
    'active', CURRENT_DATE,
    'Stylish 2-bedroom condo in the San José Hotel Zone, a short bike ride to the historic Art District and Zócalo. The community features multiple pools, a tennis court, and direct beach access via a private path.',
    'No smoking. Up to 4 occupants. No events.',
    ARRAY['Beach Access', 'Ocean View', 'High-Speed WiFi', 'Air Conditioning', 'Pool Access', 'Tennis Court', 'Bike Storage', 'Concierge Service'],
    ARRAY[
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1560185127-6a4e7d48f72d?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000001',   -- Carlos Mendoza
    NULL,
    'Calle Doblado 54, Centro Histórico',
    'San José del Cabo',
    23.0638, -109.6980,
    'House', 3, 2.0, 19500.00,
    'active', CURRENT_DATE,
    'Charming colonial-style house in the cobblestone heart of San José''s historic downtown. Original Saltillo tile floors, hand-painted Talavera accents, and a private courtyard fountain create an authentic Baja atmosphere within walking distance of galleries and farm-to-table restaurants.',
    'No smoking. No pets. Quiet hours after 10 PM.',
    ARRAY['Private Courtyard', 'High-Speed WiFi', 'Air Conditioning', 'Fully Equipped Kitchen', 'Artisan Design', 'Walk to Restaurants'],
    ARRAY[
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  -- ── The Corridor — 3 listings ─────────────────────────────────────────────

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000002',   -- Patricia Villa
    'cccccccc-0000-0000-0000-000000000002',   -- Miguel Torres
    'Palmilla One&Only Residences, Lote 7',
    'The Corridor',
    22.9786, -109.7598,
    'Villa', 4, 5.0, 60000.00,
    'active', CURRENT_DATE,
    'Ultra-luxury ocean-front villa within the One&Only Palmilla resort. Residents enjoy full access to resort amenities: three signature restaurants, a beach club, spa, and Palmilla''s legendary Jack Nicklaus golf course. Private chef and butler service available on request.',
    'Strict no-smoking policy. No pets. Minimum 3-month lease.',
    ARRAY['Oceanfront', 'Ocean View', 'Private Pool', 'Private Beach', 'High-Speed WiFi', 'Air Conditioning', 'Butler Service Available', 'Resort Amenities', 'Golf Access', 'Spa Access'],
    ARRAY[
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000003',   -- Roberto Castillo
    'cccccccc-0000-0000-0000-000000000001',   -- Diana Reyes
    'Cabo del Sol, Avenida del Sol 301 Piso 5',
    'The Corridor',
    22.9901, -109.8215,
    'Condo', 3, 3.0, 38000.00,
    'active', CURRENT_DATE,
    'Generous 3-bedroom corner unit in the sought-after Cabo del Sol resort corridor. The wraparound terrace captures sunrise views over the Sea of Cortez and sunset views down the coastline. Steps to a pristine swimming beach and the Desert/Ocean course fairways.',
    'No smoking on terrace or indoors. Up to 6 occupants. No events.',
    ARRAY['Sea of Cortez View', 'Ocean View', 'Private Pool', 'High-Speed WiFi', 'Air Conditioning', 'Beach Access', 'Golf View', 'In-Unit Washer/Dryer', 'Covered Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1920&q=80'
    ]
  ),

  (
    gen_random_uuid(),
    'bbbbbbbb-0000-0000-0000-000000000001',   -- Carlos Mendoza
    'cccccccc-0000-0000-0000-000000000003',   -- Laura Fuentes
    'Chileno Bay Residences, Sendero del Mar 18',
    'The Corridor',
    22.9679, -109.8012,
    'Villa', 2, 2.0, 32000.00,
    'active', CURRENT_DATE,
    'Boutique 2-bedroom villa in the award-winning Chileno Bay community, fronting one of Baja''s only swimmable coral-reef bays. The open-concept design maximizes cross-ventilation, reducing reliance on A/C. Rooftop deck with outdoor shower and sunbeds included.',
    'No smoking. Pets welcome with deposit. Minimum 1-month lease.',
    ARRAY['Bay View', 'Ocean View', 'Rooftop Deck', 'Beach Access', 'Snorkeling', 'High-Speed WiFi', 'Air Conditioning', 'Outdoor Shower', 'Gated Community'],
    ARRAY[
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1920&q=80'
    ]
  );

-- ---------------------------------------------------------------------------
-- 4. Leads  (3 leads — one per status — against Carlos Mendoza's first villa)
-- ---------------------------------------------------------------------------
-- We need a stable property ID to reference. Use a CTE to grab it by address.
-- ---------------------------------------------------------------------------

WITH target_property AS (
  SELECT id FROM public.properties
  WHERE address = 'Pedregal de Cabo San Lucas, Calle Farallón 12'
  LIMIT 1
)
INSERT INTO public.leads (id, property_id, renter_id, status, message, created_at, updated_at)
SELECT
  gen_random_uuid(),
  tp.id,
  renter_id,
  status::public.lead_status,
  message,
  created_at,
  created_at
FROM target_property tp
CROSS JOIN (VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    'Interested',
    'Hi! I saw your Pedregal villa listing and I''m very interested. My partner and I are relocating from Mexico City for 6 months starting next month. Could you share more details about the neighborhood and parking?',
    NOW() - INTERVAL '3 days'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
    'Contacted',
    'Hello, I''m an American expat looking for a long-term rental in Cabo for the next year. I''ve reviewed all the photos and the villa looks perfect for remote work. When would be a good time to discuss terms?',
    NOW() - INTERVAL '7 days'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003'::uuid,
    'Viewing Scheduled',
    'Hola! I''m already living in Cabo and would love to upgrade to this villa. I have excellent rental references from my current landlord. Looking forward to the viewing this Saturday!',
    NOW() - INTERVAL '1 day'
  )
) AS leads_data(renter_id, status, message, created_at);

-- ---------------------------------------------------------------------------
-- Done.
-- ---------------------------------------------------------------------------
-- Test credentials (use Supabase Dashboard → Authentication to set passwords):
--   sofia.ramirez@example.com   — renter
--   james.walker@example.com    — renter
--   elena.morales@example.com   — renter
--   carlos.mendoza@example.com  — landlord  (owns 4 listings)
--   patricia.villa@example.com  — landlord  (owns 3 listings)
--   roberto.castillo@example.com — landlord (owns 3 listings)
--   diana.reyes@example.com     — agent
--   miguel.torres@example.com   — agent
--   laura.fuentes@example.com   — agent
-- ---------------------------------------------------------------------------
