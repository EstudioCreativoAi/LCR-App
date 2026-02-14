# CLAUDE.md - LCR App (Los Cabos Rental Marketplace)

## Project Overview

Mobile-first rental marketplace for Los Cabos long-term rentals (6-12 months). Three user roles: Renter, Landlord, Agent.

## Tech Stack

- **Framework:** React Native (Expo 54) + TypeScript
- **Web:** react-native-web (deployed to Vercel)
- **Database/Auth:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Navigation:** @react-navigation/native + stack (installed, not yet wired up)
- **i18n:** react-i18next (EN + ES)
- **Styling:** React Native StyleSheet + custom theme (Poppins font, terracotta palette)

## Development Commands

```bash
npm run build          # expo export --platform web
npm run supabase:login # npx supabase login
npm run supabase:push  # npx supabase db push
```

## Project Structure

```
src/
├── App.tsx              # Root: auth gate, manual tab nav, demo mode
├── screens/             # AuthScreen
├── components/          # 12 feature components
├── hooks/               # 9 custom hooks (useAuth, useChat, useLeads, etc.)
├── services/            # 8 Supabase data services
├── types/database.ts    # Full TS types for all tables
├── theme/               # Design tokens
├── i18n/                # EN + ES locales
├── lib/supabase.ts      # Supabase client
└── utils/               # currency, images, responsive

supabase/
├── migrations/          # 18 SQL migrations
├── functions/           # 4 Edge Functions (lease-execution, delete-user, etc.)
└── seed.sql
```

## Key References

- **PRD:** `C:\Users\mario\Downloads\Los_Cabos_Rental_App_PRD.md`
- **Audit:** `CURRENT_STATUS.md` (detailed gap analysis)
- **Ops:** `docs/operations.md` (PITR guidance)

## Current Status (As of Feb 14, 2026)

- **Completed (47%):** Auth (Email), Listings (Create/View), Chat, Reviews, Commission Logic.
- **Missing/Broken:** Navigation (currently manual), Payments (Stripe), Real Signatures (DocuSign), Push Notifs.
- **Immediate Focus:** Fix Navigation -> Build Profile Edit -> Integrate Stripe.

## Skills / Workflows

### DEEP-PLAN (Use before any complex feature)

**Goal:** Create a comprehensive technical spec by interviewing the user before writing code.

1. **Analyze the Request:** Look at the user's feature request and the `CLAUDE.md` context.
2. **Identify Gaps:** Find missing details regarding:
   - UI (flows, states, responsiveness)
   - Edge cases (errors, empty states, conflicts)
   - Data schema (entities, fields, relations)
   - Permissions (who can do what)
3. **Interview:** Ask 3-5 specific, concrete questions about implementation before writing code.
   - *Example:* "How should we handle offline state for this feature?"
   - *Example:* "What specific animation should play when the lease is signed?"
4. **Finalize:** Once answers are received, output a `PLAN.md` file for the user to approve. **Do not implement until they approve the plan.**

### UI-DESIGN (Use when building UI components)

When asked to build a UI component for `**/*.tsx` or `**/components/**`:

1. **Context:** Reference `Los_Cabos_Rental_App_PRD.md` for user personas (Miguel/Sarah). If the file is not in the workspace, ask for its path or summarize personas from context.
2. **Concept:** Propose 3 distinct design directions:
   - **Minimalist** — clean, ample whitespace, restrained palette.
   - **Vibrant / Cabo-themed** — bold colors, local flavor, vacation energy.
   - **Functional** — clarity and efficiency first, dense but scannable.
3. **Audacity:** Add one "delight" factor (e.g. a micro-interaction, subtle animation, or unique layout twist).
4. **Output:** Write the component code **only after** the user selects a direction. Do not implement until they choose.

### LCR App Guidelines

- **Primary Spec:** `Los_Cabos_Rental_App_PRD.md`
- **Current Status:** See `CURRENT_STATUS.md` (47% Complete).
- **Critical Gap:** Navigation is currently manual state-based; needs proper routing.
- **Stack:** React Native (Expo), TypeScript, NativeWind, Supabase.
- **Principle:** Always run the **deep-plan** flow before starting a complex feature (interview -> gaps -> PLAN.md -> approve -> then implement).
