# INTEGRATIONS.md — LCR App

## Overview
External services, APIs, databases, and third-party integrations.
Last updated: 2026-03-07

---

## 1. Supabase (Primary Backend)

**Purpose:** PostgreSQL database, authentication, file storage, real-time subscriptions, edge functions runtime

**Client setup:** `src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js'
// EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Auth
- Provider: Email/password (Supabase Auth)
- Session storage: `AsyncStorage` (React Native)
- JWT tokens auto-refreshed by Supabase client
- No OAuth providers (Google, Apple) yet
- No phone/SMS OTP

### Database (PostgreSQL)
- **Tables:** profiles, properties, leads, messages, notifications, commissions, ratings, leases, audit_logs, api_usage
- **RLS:** Row-Level Security enabled on all tables
- **Triggers:** Profile creation trigger on auth.users insert; notification automation triggers

### Storage
| Bucket | Purpose | Access |
|--------|---------|--------|
| `property-photos` | Listing images (up to 10 per property) | Public read |
| `leases` | Signed lease documents (PDF) | Authenticated only |

### Realtime
- `postgres_changes` subscriptions for `messages` and `notifications` tables
- Used in `src/hooks/useChat.ts` and notification hooks
- Channel cleanup on unmount

### Edge Functions (Deno runtime)
| Function | Purpose | Auth |
|----------|---------|------|
| `lease-execution` | Creates lease record + mock DocuSign envelope | JWT |
| `delete-user` | Cascading user deletion + storage cleanup | Service role |
| `delete-property-photos` | Storage cleanup on property delete | Service role |
| `rate-limit-middleware` | 50 req/24h per user API rate limiting | JWT |

---

## 2. Stripe (Payment Processing)

**Status:** Partially implemented — SDK referenced but not fully integrated

**Purpose:** Deposit payment collection in MXN via PaymentIntents

**SDKs:**
- Client-side: `@stripe/stripe-js`
- Server-side: `stripe@14` (Deno, in Edge Functions)

**Known Gap:** No Stripe webhook endpoint — payment confirmation is client-initiated only. This is a security risk; server-side webhook confirmation should be added.

**Environment vars:**
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client
- `STRIPE_SECRET_KEY` — Edge Function secret (Supabase vault)

---

## 3. DocuSign (E-Signature)

**Status:** MOCKED — not implemented

**Intent:** Real lease e-signature flow

**Current state:** `supabase/functions/lease-execution/index.ts` generates a hardcoded mock UUID (`mock-envelope-id`) in place of a real DocuSign API call. No DocuSign SDK installed.

**What's needed:**
- DocuSign Node/Deno SDK
- `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_BASE_URL` secrets
- Real envelope creation + signing URL generation
- Webhook to capture signing completion

---

## 4. html2pdf.js (Client-Side PDF)

**Purpose:** Generate lease PDF on client before uploading to Supabase Storage `leases` bucket

**Usage:** Called from lease creation flow; output uploaded as blob to Supabase Storage

---

## 5. Vercel (Web Deployment)

**Purpose:** Hosting for the react-native-web build

**Config:** `vercel.json` — SPA rewrite rules (all routes → `index.html`)

**Build command:** `npm run build` → `expo export --platform web`

**Environment vars set in Vercel dashboard:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 6. Expo (Mobile Build Platform)

**Purpose:** React Native build toolchain, OTA updates, image picker, font loading

**Packages used:**
- `expo-image-picker` — photo selection from camera/gallery
- `expo-image-manipulator` — client-side image compression before upload
- `@expo-google-fonts/poppins` — Poppins font loading
- `expo-font` — font management

**Config:** `app.json` (Expo project configuration)

---

## 7. Environment Variables

### Client-Side (Expo / react-native-web)
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Edge Function Secrets (Supabase Vault)
```
STRIPE_SECRET_KEY
DOCUSIGN_INTEGRATION_KEY      # (planned, not yet added)
DOCUSIGN_ACCOUNT_ID           # (planned, not yet added)
DOCUSIGN_BASE_URL             # (planned, not yet added)
```

### CLI / Local Dev Only
```
SUPABASE_ACCESS_TOKEN         # for supabase CLI (npm run supabase:login)
SUPABASE_DB_PASSWORD          # for direct DB access
```

---

## 8. Not Yet Integrated (Planned)

| Service | Purpose | Priority |
|---------|---------|----------|
| Google Maps / Mapbox | Location search, radius filter | P3 |
| Expo Push / FCM / APNs | Push notifications | P3 |
| Sentry / Datadog | Error monitoring | P3 |
| Resend / SendGrid | Transactional email (password reset, lease emails) | P1 |
