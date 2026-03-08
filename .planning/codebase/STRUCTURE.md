# Codebase Structure

**Analysis Date:** 2026-03-07

## Directory Layout

```
LCR App/
├── app/                        # Expo Router routes (file-based navigation)
│   ├── _layout.tsx             # Root layout: fonts, SessionProvider, Stack navigator
│   ├── (auth)/                 # Auth route group
│   │   ├── _layout.tsx         # Auth group layout
│   │   └── sign-in.tsx         # Sign-in/sign-up screen
│   ├── (tabs)/                 # Main app tab group
│   │   ├── _layout.tsx         # Tab bar definition + role-gated visibility
│   │   ├── index.tsx           # Home feed (PropertyFeed)
│   │   ├── search.tsx          # Search tab
│   │   ├── saved.tsx           # Saved properties (renter only)
│   │   ├── my-listings.tsx     # Landlord/agent listings
│   │   ├── leads.tsx           # Lead dashboard (landlord/agent only)
│   │   ├── leases.tsx          # Lease dashboard (role-aware)
│   │   ├── commissions.tsx     # Commission tracker (agent only)
│   │   └── profile.tsx         # User profile
│   ├── create-listing.tsx      # Modal: create a new listing
│   ├── edit-listing/[id].tsx   # Modal: edit existing listing
│   ├── listing/[id].tsx        # Listing detail screen
│   ├── notifications.tsx       # Notification center modal
│   ├── pay/[leaseId].tsx       # Stripe payment screen
│   └── sign/[leaseId].tsx      # Lease signing screen
│
├── src/                        # All application source code
│   ├── components/             # Feature UI components
│   ├── hooks/                  # Custom React hooks (feature data + state)
│   ├── services/               # Supabase data service functions
│   ├── providers/              # React Context providers
│   ├── screens/                # Legacy/standalone screen components
│   ├── types/                  # TypeScript database + domain types
│   ├── theme/                  # Design tokens (colors, spacing, fonts)
│   ├── i18n/                   # Internationalization (EN + ES)
│   ├── lib/                    # Supabase client singleton
│   ├── templates/              # Lease HTML/PDF generation
│   └── utils/                  # Pure utility functions
│
├── supabase/                   # Supabase backend configuration
│   ├── migrations/             # 28 SQL migration files
│   ├── functions/              # 6 Deno Edge Functions
│   └── seed.sql                # Database seed data
│
├── scripts/                    # Developer utility scripts
├── docs/                       # Operational documentation
├── dist/                       # Built web output (expo export --platform web)
├── app.json                    # Expo app config
├── babel.config.js             # Babel config
├── tsconfig.json               # TypeScript config
├── vercel.json                 # Vercel deployment config
└── package.json                # Dependencies and scripts
```

## Directory Purposes

**`app/`:**
- Purpose: Expo Router file-based navigation routes. Every file here becomes a navigable route.
- Contains: Layout files (`_layout.tsx`), tab screen files, dynamic route files (`[id].tsx`), modal screens
- Key files: `app/_layout.tsx` (root, wraps everything in `SessionProvider`), `app/(tabs)/_layout.tsx` (tab bar config)

**`app/(tabs)/`:**
- Purpose: The main authenticated app shell. Tab screens delegate rendering to feature components in `src/components/`.
- Contains: One `.tsx` file per tab. Most are thin wrappers: they call `useSession()` and render a component.
- Key files: `app/(tabs)/_layout.tsx` (controls which tabs appear per role), `app/(tabs)/leases.tsx` (role-aware: renders `RenterLeaseDashboard` or `LandlordLeaseDashboard`)

**`src/components/`:**
- Purpose: All feature UI. These are the substantive screens; route files just mount them.
- Contains: 14 TSX components, one per feature domain
- Key files:
  - `src/components/PropertyFeed.tsx` - Main listing browsing UI
  - `src/components/PropertyDetail.tsx` - Full property view with contact landlord action
  - `src/components/CreateListing.tsx` - Multi-step listing creation form
  - `src/components/ChatThread.tsx` + `src/components/ChatBubble.tsx` - Real-time messaging
  - `src/components/RenterLeaseDashboard.tsx` - Renter's lease list + sign/pay actions
  - `src/components/LandlordLeaseDashboard.tsx` - Landlord/agent lease management
  - `src/components/CommissionTracker.tsx` - Agent earnings with chart
  - `src/components/LeadDashboard.tsx` + `src/components/LeadListItem.tsx` - Lead pipeline management
  - `src/components/SearchFilterModal.tsx` - Filter sheet for property search
  - `src/components/NotificationCenter.tsx` - In-app notification list
  - `src/components/ReviewSystem.tsx` - Property and renter ratings
  - `src/components/CaboCelebration.tsx` - Post-payment celebration animation

**`src/hooks/`:**
- Purpose: Custom hooks that manage loading/error state and call service functions. One hook file per feature domain.
- Contains: 9 hook files + `index.ts` barrel
- Key files:
  - `src/hooks/useAuth.ts` - Sign in/up/out (secondary to `SessionProvider`; used by `AuthScreen`)
  - `src/hooks/useProperties.ts` - Exports `useProperties`, `useProperty`, `useMyProperties`
  - `src/hooks/useLeases.ts` - Renter and owner lease fetching
  - `src/hooks/useChat.ts` - Messages + Realtime subscription management
  - `src/hooks/useCommissions.ts` - Agent commission data
  - `src/hooks/useSavedProperties.ts` - Heart-toggle and saved list

**`src/services/`:**
- Purpose: Supabase data access. Pure async functions — no state, no React. Returns `{ success, data?, error? }` shaped objects.
- Contains: 12 service files + `index.ts` barrel
- Key files:
  - `src/services/authService.ts` - Supabase Auth: signUp, signIn, signOut, getSession, onAuthStateChange
  - `src/services/propertyService.ts` - CRUD for properties, image management
  - `src/services/leaseService.ts` - Lease CRUD + `executeLease()` Edge Function call
  - `src/services/leaseDocumentService.ts` - PDF generation, signature upload, `finalizeLease()`
  - `src/services/messageService.ts` - Fetch messages, send, Realtime subscribe/unsubscribe
  - `src/services/paymentService.ts` - `createPaymentIntent()` and `confirmPayment()` Edge Function calls
  - `src/services/commissionService.ts` - Agent commissions + stats aggregation

**`src/providers/`:**
- Purpose: Global React Context providers
- Key files: `src/providers/SessionProvider.tsx` — the only provider; wraps the entire app

**`src/types/`:**
- Purpose: All TypeScript types for the database schema and domain enums
- Key files: `src/types/database.ts` — defines `Database` interface + all Row/Insert/Update types + union type aliases (`UserRole`, `PropertyStatus`, `LeaseStatus`, etc.)

**`src/theme/`:**
- Purpose: Design system tokens — import these everywhere, never hardcode values
- Key files:
  - `src/theme/theme.ts` — `COLORS`, `SPACING`, `FONTS` constants
  - `src/theme/forms.ts` — Shared form styles

**`src/i18n/`:**
- Purpose: Internationalization setup and locale strings
- Key files:
  - `src/i18n/index.ts` — i18next initialization, language detection, imports EN/ES
  - `src/i18n/locales/en.json` — English strings
  - `src/i18n/locales/es.json` — Spanish strings

**`src/lib/`:**
- Purpose: Singleton infrastructure clients
- Key files: `src/lib/supabase.ts` — creates and exports the typed Supabase client; also exports `hasSupabaseConfig`

**`src/templates/`:**
- Purpose: Lease document generation
- Key files: `src/templates/leaseTemplate.ts` — exports `generateLeaseHtml()` and `generateLeasePreviewHtml()` which produce styled HTML strings for preview and PDF rendering

**`src/utils/`:**
- Purpose: Pure, stateless utility functions
- Key files:
  - `src/utils/currency.ts` — `formatPrice()` for MXN display
  - `src/utils/images.ts` — Image URL helpers
  - `src/utils/responsive.ts` — Responsive dimension helpers

**`supabase/migrations/`:**
- Purpose: Ordered SQL migration history for the entire database schema
- Contains: 28 `.sql` files named with timestamps (e.g., `20260212145500_create_profiles_and_properties.sql`)
- Generated: No — hand-authored
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Deno-based Supabase Edge Functions for server-side logic
- Contains: 6 function directories, each with an `index.ts`
  - `lease-execution/` — Creates lease + mocked DocuSign envelope
  - `create-payment-intent/` — Creates Stripe PaymentIntent + `payments` row
  - `confirm-payment/` — Confirms Stripe payment, updates `payments` row to `completed`
  - `delete-user/` — Deletes user account with service-role key
  - `delete-property-photos/` — Removes photos from Supabase Storage
  - `rate-limit-middleware/` — API rate limiting helper

## Key File Locations

**Entry Points:**
- `app/_layout.tsx` — App root; font loading + auth guard
- `app/(tabs)/_layout.tsx` — Tab shell with role-gating
- `app/(auth)/sign-in.tsx` — Authentication entry

**Configuration:**
- `app.json` — Expo config (app name, bundle ID, web output)
- `tsconfig.json` — TypeScript config
- `babel.config.js` — Babel config
- `vercel.json` — Vercel deployment config

**Core Logic:**
- `src/providers/SessionProvider.tsx` — Auth + role state
- `src/lib/supabase.ts` — Supabase client
- `src/types/database.ts` — All DB types

**Design System:**
- `src/theme/theme.ts` — `COLORS`, `SPACING`, `FONTS` (import from here everywhere)

**Testing:**
- No test files present

## Naming Conventions

**Route Files:**
- Directories for route groups use parentheses: `(auth)/`, `(tabs)/`
- Dynamic segments use brackets: `[id].tsx`, `[leaseId].tsx`
- All route filenames are kebab-case: `sign-in.tsx`, `my-listings.tsx`, `create-listing.tsx`

**Source Files:**
- Components: PascalCase matching the component name — `PropertyFeed.tsx`, `CreateListing.tsx`
- Hooks: camelCase with `use` prefix — `useAuth.ts`, `useProperties.ts`
- Services: camelCase with `Service` suffix — `propertyService.ts`, `leaseDocumentService.ts`
- Types: camelCase — `database.ts`
- Theme/utils: camelCase — `theme.ts`, `currency.ts`

**Variables and Functions:**
- Functions: camelCase — `fetchProperties`, `createLease`, `uploadSignature`
- React components: PascalCase — `PropertyFeed`, `RenterLeaseDashboard`
- Constants: SCREAMING_SNAKE_CASE — `COLORS`, `SPACING`, `FONTS`
- Type aliases: PascalCase — `UserRole`, `LeaseStatus`, `PropertyResult`

## Where to Add New Code

**New Tab Screen:**
- Route file: `app/(tabs)/[screen-name].tsx` (thin wrapper, calls `useSession()`, renders a component)
- Component: `src/components/[FeatureName].tsx`
- Register in tab bar: `app/(tabs)/_layout.tsx` — add a `<Tabs.Screen>` entry with role-gating if needed

**New Modal Screen:**
- Route file: `app/[screen-name].tsx` or `app/[screen-name]/[id].tsx`
- Register in `app/_layout.tsx` Stack with `presentation: 'modal'`
- Component logic: `src/components/[FeatureName].tsx` if complex; inline in the route file if simple

**New Feature Component:**
- Implementation: `src/components/[FeatureName].tsx`
- Hook (if data-fetching needed): `src/hooks/use[FeatureName].ts`
- Service (if new Supabase table): `src/services/[featureName]Service.ts`
- Export hook from barrel: add to `src/hooks/index.ts`
- Export service from barrel: add to `src/services/index.ts`

**New Supabase Table:**
- Migration: `supabase/migrations/[timestamp]_[description].sql`
- TypeScript types: add Row/Insert/Update interfaces to `src/types/database.ts` and add to the `Database.public.Tables` map
- Service: `src/services/[tableName]Service.ts`

**New Edge Function:**
- Directory: `supabase/functions/[function-name]/index.ts`
- Call from client: `supabase.functions.invoke('[function-name]', { body: {...} })` in the relevant service file

**Shared Utilities:**
- Pure helpers: `src/utils/[name].ts`
- Theme values: add to `src/theme/theme.ts` under existing `COLORS`, `SPACING`, or `FONTS`
- i18n strings: add keys to both `src/i18n/locales/en.json` and `src/i18n/locales/es.json`

## Special Directories

**`dist/`:**
- Purpose: Output of `npm run build` (`expo export --platform web`)
- Generated: Yes
- Committed: No (should be in `.gitignore`)

**`.planning/`:**
- Purpose: GSD workflow documents (codebase maps, feature plans, phases)
- Generated: Yes (by GSD agent tooling)
- Committed: Yes (planning artifacts are tracked)

**`supabase/.temp/`:**
- Purpose: Supabase CLI temporary files
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-07*
