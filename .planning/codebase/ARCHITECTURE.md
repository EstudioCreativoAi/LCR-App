# Architecture

**Analysis Date:** 2026-03-07

## Pattern Overview

**Overall:** Role-gated mobile-first marketplace with a layered service architecture

**Key Characteristics:**
- Three-role system (renter, landlord, agent) controls tab visibility, component rendering, and data access at every layer
- Expo Router file-based routing with `(auth)` / `(tabs)` route groups for auth-guarded navigation
- Supabase as the single backend: PostgreSQL + Auth + Realtime + Storage + Edge Functions
- React Context (`SessionProvider`) owns global auth/role state; all screens consume it via `useSession()`
- Services layer is purely functional — no classes, no singletons — each service file exports async functions that call Supabase directly

## Layers

**Routing Layer:**
- Purpose: File-based navigation, auth guarding, tab visibility by role
- Location: `app/`
- Contains: `_layout.tsx` files, route files, dynamic segment files (`[id].tsx`, `[leaseId].tsx`)
- Depends on: `SessionProvider`, theme tokens, feature components from `src/components/`
- Used by: End users navigating the app

**State / Auth Layer:**
- Purpose: Holds session, user role, and demo mode state; provides auth actions
- Location: `src/providers/SessionProvider.tsx`
- Contains: `SessionContext`, `SessionProvider`, `useSession` hook
- Depends on: `src/lib/supabase.ts`, `src/types/database.ts`
- Used by: `app/_layout.tsx` (guards routes), all tabs and screens that need role or session

**Feature Hooks Layer:**
- Purpose: Bridge between UI components and the service layer; manage loading/error state per feature
- Location: `src/hooks/`
- Contains: `useAuth`, `useProperties`, `useLeases`, `useLeads`, `useChat`, `useCommissions`, `useNotifications`, `useRatings`, `useSavedProperties`
- Depends on: `src/services/`
- Used by: Feature components in `src/components/` and some route screens

**Service Layer:**
- Purpose: All Supabase interactions — CRUD, Realtime subscriptions, Edge Function invocations
- Location: `src/services/`
- Contains: One file per domain — `authService`, `propertyService`, `leaseService`, `leaseDocumentService`, `commissionService`, `leadService`, `messageService`, `notificationService`, `paymentService`, `profileService`, `ratingService`, `savedPropertyService`
- Depends on: `src/lib/supabase.ts`, `src/types/database.ts`
- Used by: Feature hooks and a few route screens that call Supabase directly

**Component Layer:**
- Purpose: Rendered feature UI; receive role/session as props or via `useSession`
- Location: `src/components/`
- Contains: 14 components including `PropertyFeed`, `PropertyDetail`, `CreateListing`, `ChatThread`, `RenterLeaseDashboard`, `LandlordLeaseDashboard`, `CommissionTracker`, `LeadDashboard`
- Depends on: hooks, services, theme tokens
- Used by: Route files in `app/(tabs)/` and modal routes

**Backend / Edge Functions Layer:**
- Purpose: Server-side logic requiring service-role credentials or third-party APIs (Stripe, DocuSign stub)
- Location: `supabase/functions/`
- Contains: `lease-execution`, `create-payment-intent`, `confirm-payment`, `delete-user`, `delete-property-photos`, `rate-limit-middleware`
- Depends on: Supabase service role key, Stripe secret key
- Used by: `paymentService.ts`, `leaseService.ts`

**Infrastructure Layer:**
- Purpose: Supabase client singleton, TypeScript DB types, theme tokens, i18n, utilities
- Location: `src/lib/`, `src/types/`, `src/theme/`, `src/i18n/`, `src/utils/`
- Contains: `supabase.ts`, `database.ts`, `theme.ts`, `forms.ts`, `currency.ts`, `images.ts`, `responsive.ts`
- Depends on: environment variables `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Used by: All other layers

## Data Flow

**Standard Screen Render:**

1. Route file (e.g., `app/(tabs)/index.tsx`) calls `useSession()` to get `role` and `isDemo`
2. Renders the appropriate feature component, passing role/isDemo as props
3. Feature component calls a feature hook (e.g., `useProperties()`)
4. Hook calls a service function (e.g., `propertyService.fetchProperties()`)
5. Service calls Supabase client (`supabase.from('properties').select(...)`)
6. Result flows back up: service returns `{ success, data, error }`, hook sets local state, component re-renders

**Realtime Chat Flow:**

1. `useChat(leadId, senderId)` is called by `ChatThread` component
2. Hook calls `messageService.fetchMessages(leadId)` for initial load
3. Hook calls `messageService.subscribeToMessages(leadId, onNewMessage)` which creates a Supabase Realtime channel
4. New messages arrive via `postgres_changes` INSERT event and are appended to local state
5. On cleanup, `messageService.unsubscribeFromMessages(channel)` removes the channel

**Lease Signing Flow:**

1. Renter navigates to `app/sign/[leaseId].tsx`
2. Screen fetches lease + property + profile data directly from Supabase
3. `generateLeasePreviewHtml()` from `src/templates/leaseTemplate.ts` renders HTML preview
4. Renter draws signature on `react-signature-canvas`
5. `leaseDocumentService.generateLeasePdf()` uses `html2pdf.js` to produce a PDF blob (web only)
6. `uploadSignature()` and `uploadLeasePdf()` store files in Supabase Storage (`leases` bucket)
7. `finalizeLease()` updates the lease row: status → `active`, sets `signature_url`, `document_url`, `signed_at`
8. Router pushes to `app/pay/[leaseId].tsx`

**Payment Flow:**

1. `paymentService.createPaymentIntent(leaseId, payerId)` invokes Edge Function `create-payment-intent`
2. Edge Function creates a Stripe PaymentIntent and a `payments` row with status `pending`, returns `clientSecret`
3. Client mounts Stripe `<Elements>` + `<CardElement>` with the client secret
4. `stripe.confirmCardPayment(clientSecret, ...)` collects and confirms the card
5. On success, `paymentService.confirmPayment(paymentId, paymentIntentId)` invokes Edge Function `confirm-payment`
6. Edge Function updates the `payments` row to `completed` and activates the lease
7. Router replaces to `/(tabs)/leases`

**Auth / Route Guard Flow:**

1. `RootLayout` wraps everything in `<SessionProvider>`
2. `SessionProvider` calls `supabase.auth.getSession()` on mount, then subscribes to `onAuthStateChange`
3. After session is known, `fetchProfile(userId)` reads the `profiles.role` column
4. `RootLayoutNav` watches `session`, `isLoading`, and `segments`
5. Unauthenticated users in non-auth routes → redirected to `/(auth)/sign-in`
6. Authenticated users in auth routes → redirected to `/(tabs)`

**State Management:**
- No global store (no Redux, Zustand, etc.)
- Auth/role state lives in `SessionContext` (React Context)
- Per-feature state lives in custom hooks using `useState` + `useEffect` + `useCallback`
- No persistent client-side cache; all data is re-fetched on mount or explicit `refetch()` call

## Key Abstractions

**`Result<T>` Pattern:**
- Purpose: Uniform success/error shape returned by all service functions
- Examples: `PropertyResult<T>` in `src/services/propertyService.ts`, `LeaseResult<T>` in `src/services/leaseService.ts`, `MessageResult<T>` in `src/services/messageService.ts`
- Pattern: `{ success: boolean; data?: T; error?: string }` — avoids thrown exceptions at the service boundary

**`SessionContext`:**
- Purpose: Single source of truth for `session`, `role`, `isDemo`, `isLoading`
- Location: `src/providers/SessionProvider.tsx`
- Pattern: `createContext` + `useContext` with a non-null assertion guard in `useSession()`; consumed by all route files and most feature components

**Role-Gated Tab Visibility:**
- Purpose: Show/hide tabs based on `UserRole`
- Location: `app/(tabs)/_layout.tsx`
- Pattern: `href: isRenter ? '/saved' : null` — passing `null` to `href` hides the tab from the tab bar

**Demo Mode:**
- Purpose: Allow unauthenticated visitors to explore without Supabase credentials
- Location: `src/providers/SessionProvider.tsx`, `enterDemo(role)` function
- Pattern: Sets a fake `Session` object in state, bypasses all Supabase calls in screens by checking `isDemo` before data fetching

**`WithDetails` Join Types:**
- Purpose: Typed shapes for Supabase relational joins
- Examples: `LeaseWithDetails`, `CommissionWithDetails`, `PropertyWithImages`
- Pattern: Extends the base entity interface with optional nested objects matching the Supabase `select` join syntax

## Entry Points

**App Root:**
- Location: `app/_layout.tsx`
- Triggers: Expo Router on app launch
- Responsibilities: Load fonts, wrap in `SessionProvider`, run auth guard, declare the Stack navigator

**Tab Shell:**
- Location: `app/(tabs)/_layout.tsx`
- Triggers: Navigating to `/(tabs)` after authentication
- Responsibilities: Define all tabs, conditionally hide tabs by role, render `HeaderRight` (notifications bell, language toggle, sign out)

**Auth Screen:**
- Location: `app/(auth)/sign-in.tsx` and `src/screens/AuthScreen.tsx`
- Triggers: Unauthenticated user or redirect from route guard
- Responsibilities: Sign-in / sign-up form, role selection, demo mode entry

**Home Feed:**
- Location: `app/(tabs)/index.tsx` → `src/components/PropertyFeed.tsx`
- Triggers: Default tab on login
- Responsibilities: Display paginated property listings with filtering

## Error Handling

**Strategy:** Errors are caught at the service layer and surfaced as `{ success: false, error: string }` objects; UI hooks translate these into local `error` state strings displayed in components

**Patterns:**
- Service functions wrap all Supabase calls in `try/catch`; caught errors return `err instanceof Error ? err.message : 'fallback string'`
- Route screens that call Supabase directly (e.g., `app/listing/[id].tsx`, `app/sign/[leaseId].tsx`) use `Alert.alert('Error', message)` and call `router.back()` on fatal errors
- Edge Functions return HTTP 400 with `{ error: message }` JSON on failure; `paymentService.ts` throws from the error shape
- Demo mode paths skip all error-prone network calls entirely

## Cross-Cutting Concerns

**Internationalization:** `react-i18next` with `en.json` and `es.json` locales in `src/i18n/locales/`; language is toggled inline in the tab header via `i18n.changeLanguage()`. Keys accessed via `useTranslation()` hook's `t()` function.

**Styling:** React Native `StyleSheet.create()` for all styles. No NativeWind/Tailwind in this project. All color, spacing, and font tokens live in `src/theme/theme.ts` (`COLORS`, `SPACING`, `FONTS`). Poppins font loaded via `@expo-google-fonts/poppins` in `app/_layout.tsx`.

**Authentication:** Supabase Auth with email/password. Session persisted to `AsyncStorage` (configured in `src/lib/supabase.ts`). Role is stored in the `profiles` table and fetched after session is established.

**RLS / Permissions:** Supabase Row Level Security policies are defined in `supabase/migrations/` SQL files. The client uses the anon key; the Edge Functions use the service role key for privileged operations.

**Audit / Logging:** `audit_logs` table exists in the schema. Triggers are defined in migration `20260213180000_audit_logs_and_profile_role_trigger.sql`. Notification automation via `20260213000500_notification_automation.sql` (DB triggers insert to `notifications` table).

---

*Architecture analysis: 2026-03-07*
