# CONCERNS.md — LCR App

## Overview
Technical debt, known issues, security concerns, performance gaps, and fragile areas.
Last updated: 2026-03-07

---

## 1. Critical Missing Features (MVP Blockers)

### Payment Processing — NOT IMPLEMENTED
- **Severity:** Critical
- **Impact:** App cannot complete a rental transaction
- Stripe SDK not installed; `package.json` has no payment dependency
- Payment buttons in `RenterLeaseDashboard.tsx` are stubs with `TODO` comments
- No `payments` table in Supabase migrations
- **Debt:** Entire PRD section 4.7 (4 features) is 0% complete

### E-Signature — MOCKED (Not Real)
- **Severity:** Critical
- **Impact:** Leases are legally unenforceable
- `supabase/functions/lease-execution/` generates a fake `mock-envelope-id` instead of calling DocuSign API
- DocuSign SDK not installed
- No in-app document viewer or PDF download
- **Debt:** PRD section 4.6 is ~40% complete; signing flow is entirely fake

### Navigation — Manual State (Not Proper Stack)
- **Severity:** High
- **Impact:** No deep linking, no back stack, poor UX on web
- `@react-navigation/native` + `@react-navigation/stack` are installed but **not wired up**
- All navigation is manual `useState` tab switching in `App.tsx`
- No stack navigation means modals can't stack properly; no URL-based routing for web
- **File:** `src/App.tsx` (entire navigation logic is manual)

---

## 2. Authentication & Profile Gaps

### No Password Reset Flow
- `authService.ts` calls `supabase.auth.signInWithPassword` but has no `resetPasswordForEmail` implementation
- Users who forget their password are permanently locked out

### Incomplete Profile at Sign-Up
- Only `full_name` and `role` are collected; `phone`, `avatar_url`, `bio` left blank
- No profile edit screen exists — users cannot update info after sign-up
- No agent assignment UI for linking agents to property listings

### Phone Auth Missing
- Only email/password auth; PRD requires phone number sign-up option
- No SMS OTP flow

---

## 3. Security Concerns

### RLS Policies — Verify Completeness
- 18 migrations include RLS setup but some policies may have gaps
- `rate-limit-middleware` edge function enforces 50 req/24h — verify this covers all sensitive endpoints
- No server-side validation that `agent_id` on a listing belongs to a verified agent

### Mock DocuSign Credentials Exposure
- `supabase/functions/lease-execution/` should not log or store mock envelope IDs as if they were real
- If DocuSign is wired up in future, credentials must go to Supabase secrets, not hardcoded

### Demo Mode Data
- `App.tsx` demo mode bypasses all auth — verify it's gated from production builds
- Mock data in demo mode should not resemble real user PII

### Storage Bucket Permissions
- `property-photos` bucket exists; confirm public read is scoped to property photos only, not user docs

---

## 4. Performance Concerns

### No Pagination on PropertyFeed
- `src/components/PropertyFeed.tsx` fetches properties; no cursor or page limit evident
- As listings grow, a single query returning all rows will degrade
- `@shopify/flash-list` is used (good for rendering), but data fetching is unbounded

### Image Compression — Client-Side Only
- `expo-image-manipulator` compresses images on device before upload
- No server-side resizing or CDN image optimization (no Cloudinary/imgix)
- 10 photos per listing at potentially high resolution could stress Supabase Storage bandwidth

### No Caching Layer
- No React Query, SWR, or similar caching; every screen mount re-fetches from Supabase
- Real-time subscriptions (Supabase Realtime) are good for chat but not used for feed/listings

---

## 5. i18n Incompleteness

- i18n infrastructure (react-i18next) exists with `en.json` and `es.json`
- Only ~20 strings translated; most component UI text is hardcoded English
- **Files affected:** Virtually all `.tsx` components have untranslated hardcoded strings
- No RTL support (not needed for EN/ES but worth noting)

---

## 6. Feature Stubs / Dead Code

### RenterLeaseDashboard Action Buttons
- "Pay Deposit", "View Lease", "Contact Landlord" buttons exist but are non-functional stubs
- **File:** `src/components/RenterLeaseDashboard.tsx`

### Property Status Management
- DB `status` column supports `active | rented | paused`
- No UI to change listing status — landlords cannot mark a property as rented
- **File:** Property detail / `CreateListing.tsx` (no edit path)

### Sort Controls on Feed
- No sort by newest/price/distance in `PropertyFeed.tsx` or `SearchFilterModal.tsx`
- Filter modal has price + beds + date but no ordering

### Edit / Delete Listing
- `deleteProperty` service exists in `src/services/propertyService.ts`
- No delete button in UI; no edit listing screen

---

## 7. Missing Infrastructure

| Item | Status | Risk |
|------|--------|------|
| Push Notifications (FCM/APNs/Expo Push) | Missing | Users miss time-sensitive alerts |
| Payments table (Supabase migration) | Missing | Can't track payment history when Stripe added |
| Favorites/Saved listings table | Missing | No persistence for saved properties |
| Map / geolocation SDK | Missing | No location-based search |
| Password reset email template | Missing | Auth is incomplete |
| Profile edit screen | Missing | Core UX gap |

---

## 8. Fragile Areas

### App.tsx Complexity
- `src/App.tsx` handles: auth state, demo mode, tab navigation, role detection, font loading
- Single file doing too much — difficult to test or extend
- Manual tab state (`activeTab`) will become increasingly fragile as screens are added

### useAuth Hook Coupling
- `src/hooks/useAuth.ts` is used everywhere; if Supabase session shape changes, cascading failures across all components

### 18 SQL Migrations — No Rollback Scripts
- `supabase/migrations/` contains forward-only SQL
- No `down` migrations; rollbacks require manual intervention

### Edge Functions — No Integration Tests
- 4 edge functions (`lease-execution`, `delete-user`, `delete-property-photos`, `rate-limit-middleware`)
- No automated tests; behavior verified only manually

---

## 9. Debt Prioritization

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | Wire up @react-navigation | Medium |
| P0 | Payment integration (Stripe) | High |
| P1 | Real e-signature (DocuSign or native capture) | High |
| P1 | Profile edit screen + password reset | Low |
| P1 | Fix RenterLeaseDashboard stubs | Low |
| P2 | Complete i18n translation coverage | Medium |
| P2 | Add pagination to PropertyFeed | Low |
| P2 | Edit/Delete listing UI | Low |
| P3 | Push notifications | Medium |
| P3 | Map/geolocation integration | High |
| P3 | Add payments DB migration | Low |
