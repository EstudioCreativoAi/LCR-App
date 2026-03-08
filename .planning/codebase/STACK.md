# Technology Stack

**Analysis Date:** 2026-03-07

## Languages

**Primary:**
- TypeScript 5.9.2 - All React Native source code (`src/`, `app/`) and Supabase Edge Functions
- JavaScript - `babel.config.js`, `scripts/` utilities

**Secondary:**
- SQL - Supabase migrations (`supabase/migrations/*.sql`) and seed data (`supabase/seed.sql`)
- Deno TypeScript - Supabase Edge Functions (runtime is Deno 2, not Node.js)

## Runtime

**Environment:**
- Node.js v22.20.0 — local dev tooling and build
- Deno 2 — Edge Function runtime (configured in `supabase/config.toml`)

**Package Manager:**
- npm 10.9.3
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.1.0 — UI rendering
- React Native 0.81.5 — cross-platform mobile/web primitives
- Expo SDK 54.0.0 — managed workflow, device APIs, build tooling
- expo-router 6.0.23 — file-based navigation (entry: `expo-router/entry`)
- react-native-web 0.21.0 — browser rendering target

**Navigation:**
- @react-navigation/native 7.1.28 — installed as peer dependency
- @react-navigation/stack 7.7.1 — installed as peer dependency
- expo-router (active) — file-system routing in `app/` directory; `@react-navigation` packages are present but navigation is handled through expo-router

**Animation / Gesture:**
- react-native-reanimated 4.2.1 — animations
- react-native-gesture-handler 2.30.0 — gesture recognition
- react-native-worklets 0.7.3 — worklet threading support

**Internationalization:**
- i18next 25.8.6 — translation engine
- react-i18next 16.5.4 — React bindings
- expo-localization 17.0.8 — device locale detection
- Locales: `src/i18n/locales/en.json`, `src/i18n/locales/es.json`

**Build/Dev:**
- Metro bundler (via Expo) — web bundler configured as `metro` in `app.json`
- babel-preset-expo — Babel preset in `babel.config.js`
- Vercel — web deployment; config in `vercel.json`

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.95.3 — database, auth, storage, realtime, edge function invocation; client in `src/lib/supabase.ts`
- @stripe/react-stripe-js 5.6.0 + @stripe/stripe-js 8.7.0 — payment UI components and Stripe.js loader
- expo-image-picker 17.0.10 — property photo uploads
- expo-image-manipulator 14.0.8 — image resizing before upload
- react-signature-canvas 1.1.0-alpha.2 — lease signature capture (web only)
- html2pdf.js 0.14.0 — PDF generation for lease documents

**Infrastructure:**
- @react-native-async-storage/async-storage 2.2.0 — Supabase session persistence across app restarts
- react-native-url-polyfill 3.0.0 — URL API polyfill required by Supabase JS client in RN
- @shopify/flash-list 2.2.2 — performant list rendering for property feeds
- react-native-svg 15.12.1 — SVG support
- expo-linear-gradient 15.0.8 — gradient UI elements
- lucide-react-native 0.564.0 — icon library
- @expo-google-fonts/poppins 0.4.1 — Poppins font (Regular, Medium, SemiBold, Bold loaded in `app/_layout.tsx`)

**UI / Layout:**
- react-native-safe-area-context 5.6.2
- react-native-screens 4.23.0
- @react-native-community/datetimepicker 8.6.0 — date pickers in listing forms
- @react-native-community/slider 5.1.2 — price range filters
- expo-screen-orientation 9.0.8

## Configuration

**Environment:**
- Configured via `EXPO_PUBLIC_*` prefix for client-side vars (exposed to React Native bundle)
- Required at runtime: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Required for CLI operations: `SUPABASE_PROJECT_REF`
- Required in Edge Functions (Supabase secrets): `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Template: `.env.example`
- Local overrides: `.env`, `.env.local`

**Build:**
- `app.json` — Expo config (name, slug, SDK version, platforms, web bundler)
- `tsconfig.json` — extends `expo/tsconfig.base`, strict mode enabled, `baseUrl: "."`
- `babel.config.js` — single preset: `babel-preset-expo`
- `vercel.json` — build command, output dir (`dist`), SPA rewrite rule

**TypeScript:**
- Strict mode enabled
- No path aliases configured (baseUrl is `.`)
- Type definitions: `src/types/database.ts` (Supabase DB types), `@types/react`, `@types/react-native`

## Platform Requirements

**Development:**
- Node.js ≥ 22
- npm ≥ 10
- Supabase CLI (for local dev and migrations: `npx supabase`)
- `.env.local` with valid Supabase credentials

**Production:**
- Web: Vercel (static export via `expo export --platform web` → `dist/`)
- Mobile: iOS and Android via Expo (EAS Build or bare workflow; not yet configured)
- Database: Supabase hosted PostgreSQL 17
- Edge Functions: Supabase Deno runtime

---

*Stack analysis: 2026-03-07*
