# PLAN: Deposit Payment Flow (Stripe + Supabase Edge Functions)

**Status:** Awaiting approval
**Scope:** End-to-end deposit payment: Stripe PaymentIntent via Edge Function, Payment Sheet UI, post-payment state machine, celebration screen

---

## 1. Install dependencies

```bash
npm install @stripe/stripe-react-native
```

No Expo config plugin needed for web-only (Stripe React Native supports web via `@stripe/stripe-js` under the hood). For native builds later, the Expo config plugin would be added to `app.json`.

---

## 2. Supabase migration: `20260214200000_create_payments_table.sql`

### 2a. Create `payments` table

```sql
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_mxn NUMERIC(12, 2) NOT NULL CHECK (amount_mxn > 0),
  payment_type TEXT NOT NULL DEFAULT 'deposit',  -- deposit | rent | commission
  status TEXT NOT NULL DEFAULT 'pending',         -- pending | completed | failed | refunded
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

### 2b. RLS policies

- Payers can view their own payments
- Recipients can view payments sent to them
- Service role (Edge Function) can INSERT/UPDATE

### 2c. Add `'Deposit Paid'` to `lead_status` enum

```sql
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Deposit Paid' AFTER 'Lease Sent';
```

### 2d. Indexes

```sql
CREATE INDEX idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
```

---

## 3. Supabase Edge Function: `create-payment-intent`

**Path:** `supabase/functions/create-payment-intent/index.ts`

### Input (POST body)
```json
{
  "lease_id": "uuid",
  "payer_id": "uuid"
}
```

### Logic
1. Fetch the lease (get `deposit_amount`, `property_id`, `renter_id`)
2. Verify `payer_id === lease.renter_id` (security check)
3. Check no existing completed deposit payment for this lease
4. Call Stripe API: `stripe.paymentIntents.create({ amount: deposit_amount * 100, currency: 'mxn' })`
5. Insert a `payments` record with `status: 'pending'` and `stripe_payment_intent_id`
6. Return `{ clientSecret, paymentId }` to the client

### Environment variables (Supabase secrets)
- `STRIPE_SECRET_KEY` — Stripe secret key (set via `supabase secrets set`)

### Stripe SDK in Deno
```ts
import Stripe from 'https://esm.sh/stripe@14?target=deno'
```

---

## 4. Supabase Edge Function: `confirm-payment`

**Path:** `supabase/functions/confirm-payment/index.ts`

Called by the client AFTER Stripe Payment Sheet confirms success. (Belt-and-suspenders — the real source of truth would be a Stripe webhook in production, but for MVP this client-confirmed flow is sufficient.)

### Input (POST body)
```json
{
  "payment_id": "uuid",
  "payment_intent_id": "pi_xxx"
}
```

### Logic (all in a single transaction-like sequence)
1. Verify the PaymentIntent status via Stripe API (`stripe.paymentIntents.retrieve`)
2. If `status === 'succeeded'`:
   a. Update `payments` record → `status: 'completed'`
   b. Fetch the lease to get `property_id`, `lead_id`, `agent_id`
   c. Update `leads` → `status: 'Deposit Paid'` (for the matching lead)
   d. Update `properties` → `status: 'paused'` (remove from feed)
   e. If `agent_id` exists → INSERT into `commissions` (10% of deposit)
   f. INSERT two `notifications`:
      - Renter: "Welcome home! Your deposit for [address] has been confirmed."
      - Landlord: "Deposit received! [renter_name] has paid for [address]."
3. Return `{ success: true, payment }` or error

---

## 5. New route: `app/pay/[leaseId].tsx`

A full-screen payment route (NOT a modal — this is a serious financial action that deserves full attention).

**URL:** `/pay/abc-123`

### Screen structure (3 phases)

#### Phase 1: Payment Summary Card
```
┌─────────────────────────────┐
│  [Property Hero Image]       │
│                              │
│  123 Calle Marina, Cabo      │
│  ─────────────────────       │
│  SECURITY DEPOSIT            │
│  $25,000 MXN                 │
│  ─────────────────────       │
│  Monthly Rent    $25,000     │
│  Lease Term      12 months   │
│  Landlord        Carlos R.   │
│  ─────────────────────       │
│                              │
│  [ Pay Deposit — $25,000 ]   │
│                              │
│  🔒 Secured by Stripe        │
└─────────────────────────────┘
```

- White card on sand background
- Property photo at top (from `properties.photos[0]`)
- Amount in large bold Poppins
- Breakdown details below
- CTA button triggers Stripe Payment Sheet

#### Phase 2: Stripe Payment Sheet
- Triggered by `presentPaymentSheet()` from `@stripe/stripe-react-native`
- Native UI handles card input, Apple Pay, Google Pay
- On success → call `confirm-payment` Edge Function → transition to Phase 3

#### Phase 3: Cabo Celebration Screen
Full-screen takeover:
- **Background:** `LinearGradient` sunset (`#FF8C00` → `#FF0080`)
- **Animation sequence:**
  1. A key icon scales in (spring) at center
  2. Key morphs/fades into a house icon (cross-fade with scale)
  3. Confetti particles rain from top (custom Reanimated particle system — 30 small colored circles with random X drift and gravity)
  4. Text fades in: "Welcome Home, [FirstName]." (large) + "Your Cabo adventure begins." (subtitle)
- **Auto-dismiss:** After 4 seconds, show a "Continue" button that navigates to `/(tabs)/leases`
- **Fallback:** Tapping anywhere also dismisses

---

## 6. Integration points (wiring it up)

### 6a. Auto-navigate after lease execution
In the component that calls `executeLease()` (LeadDashboard), after success:
```ts
router.push(`/pay/${leaseId}`)
```

### 6b. Fallback "Pay Deposit" on RenterLeaseDashboard
Replace the stub `handlePayNextMonth` button:
- If lease has no completed deposit payment → show "Pay Deposit" button
- On press → `router.push(`/pay/${lease.id}`)`
- If deposit already paid → show "Deposit Paid ✓" badge instead

### 6c. Stripe initialization
In `app/_layout.tsx`, wrap the app with `<StripeProvider>`:
```tsx
<StripeProvider publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
  <SessionProvider>
    <RootLayoutNav />
  </SessionProvider>
</StripeProvider>
```

---

## 7. New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260214200000_create_payments_table.sql` | payments table + enum update |
| `supabase/functions/create-payment-intent/index.ts` | Edge Function: creates Stripe PaymentIntent |
| `supabase/functions/confirm-payment/index.ts` | Edge Function: post-payment state machine |
| `app/pay/[leaseId].tsx` | Payment screen (summary + celebration) |
| `src/services/paymentService.ts` | Client-side: create intent, confirm payment |
| `src/components/CaboCelebration.tsx` | Reanimated confetti + welcome home animation |

## 8. Modified files

| File | Change |
|------|--------|
| `package.json` | Add `@stripe/stripe-react-native` |
| `app/_layout.tsx` | Wrap with `<StripeProvider>` |
| `app/_layout.tsx` (Stack) | Add `pay/[leaseId]` route |
| `src/types/database.ts` | Add `Payment` interface + update `LeadStatus` |
| `src/components/RenterLeaseDashboard.tsx` | Replace stub "Pay" button with real deposit CTA |
| `src/components/LeadDashboard.tsx` | After `executeLease` success → navigate to `/pay/[leaseId]` |

---

## 9. Execution order

1. `npm install @stripe/stripe-react-native`
2. Create migration `20260214200000_create_payments_table.sql`
3. Push migration: `npx supabase db push`
4. Add `Payment` type to `src/types/database.ts`
5. Create `src/services/paymentService.ts`
6. Create Edge Function `supabase/functions/create-payment-intent/index.ts`
7. Create Edge Function `supabase/functions/confirm-payment/index.ts`
8. Deploy Edge Functions: `npx supabase functions deploy create-payment-intent` + `confirm-payment`
9. Build `src/components/CaboCelebration.tsx` (confetti + animation)
10. Build `app/pay/[leaseId].tsx` (summary card + Stripe Sheet + celebration)
11. Update `app/_layout.tsx` with StripeProvider + new route
12. Update `RenterLeaseDashboard.tsx` (replace stub Pay button)
13. Update `LeadDashboard.tsx` (auto-navigate after lease execution)
14. Build verify: `npx expo export --platform web`

---

## 10. Environment variables needed

| Variable | Where | Value |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | Supabase secrets | `sk_test_...` or `sk_live_...` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel env + `.env` | `pk_test_...` or `pk_live_...` |

Set via:
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
# Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to Vercel and local .env
```

---

## 11. Post-payment state machine (visual)

```
Renter taps "Pay Deposit"
  │
  ├─► Client calls create-payment-intent Edge Function
  │     └─► Returns clientSecret
  │
  ├─► Client opens Stripe Payment Sheet (clientSecret)
  │     └─► User enters card / Apple Pay / Google Pay
  │
  ├─► Stripe confirms payment
  │     └─► Client calls confirm-payment Edge Function
  │           ├─► payments.status → 'completed'
  │           ├─► leads.status → 'Deposit Paid'
  │           ├─► properties.status → 'paused'
  │           ├─► commissions INSERT (if agent, 10% of deposit)
  │           ├─► notification → renter ("Welcome home!")
  │           └─► notification → landlord ("Deposit received!")
  │
  └─► Client shows Cabo Celebration screen
        └─► "Continue" → /(tabs)/leases
```

---

## 12. What this plan does NOT include

- **Stripe Connect / landlord payouts** — deferred to V2
- **Recurring rent payments** — deferred to V2
- **Stripe webhooks** — MVP uses client-confirmed flow; webhook hardening is V2
- **Refund flow** — not in MVP scope
- **Receipt PDF generation** — payment record in DB is sufficient for MVP
- **PayPal / bank transfer** — Stripe-only for MVP

---

## 13. Demo mode

The payment flow will detect `isDemo` and skip the real Stripe call:
- Show the summary card with mock data
- "Pay" button simulates a 2-second loading delay
- Immediately show the Cabo Celebration screen
- No Edge Function calls, no DB writes

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `@stripe/stripe-react-native` web support | Uses `@stripe/stripe-js` on web automatically; Payment Sheet works cross-platform |
| Stripe API key leaks | Secret key is ONLY in Supabase Edge Function env; publishable key is safe for client |
| Double payment (user clicks twice) | Edge Function checks for existing completed payment before creating intent |
| Payment succeeds but confirm-payment fails | Stripe webhook (V2) will catch this; for MVP the payment record stays `pending` and can be manually reconciled |
| `lead_status` enum alteration | `ADD VALUE IF NOT EXISTS` is safe and non-blocking in Postgres |
| MXN centavos math | Stripe MXN is in centavos; Edge Function multiplies by 100 before sending to Stripe |
