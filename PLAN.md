# PLAN: Simple Lease Signature (Sign on Glass + PDF Generation)

**Status:** Awaiting approval
**Scope:** Signature pad capture, PDF generation from HTML template, Supabase Storage upload, in-app PDF viewer, auto-navigate to payment

---

## 1. Install dependencies

```bash
npm install react-signature-canvas html2pdf.js
npm install --save-dev @types/react-signature-canvas
```

**Why these packages:**
- `react-signature-canvas` — React DOM canvas-based signature pad. Works on web (our primary platform). 383k weekly downloads, TypeScript support.
- `html2pdf.js` — Client-side HTML → PDF conversion (html2canvas + jsPDF under the hood). No server needed.

**NOT using** `react-native-signature-canvas` (native-only, uses WebView), `expo-print` (web = browser print dialog only), or `expo-sharing` (native-only).

---

## 2. Supabase migration: `20260214210000_lease_signature_fields.sql`

### 2a. Add signature/document columns to `leases`

```sql
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
```

- `signature_url` — URL of the PNG signature image in storage
- `document_url` — URL of the final signed PDF in storage
- `signed_at` — timestamp when renter signed

### 2b. Create `leases` storage bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('leases', 'leases', true)
ON CONFLICT (id) DO NOTHING;

-- Renter or landlord can read lease documents for their leases
CREATE POLICY "Lease parties can read documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'leases'
    AND auth.uid() IN (
      SELECT renter_id FROM public.leases WHERE id::text = (storage.foldername(name))[1]
      UNION
      SELECT p.landlord_id FROM public.leases l
        JOIN public.properties p ON l.property_id = p.id
        WHERE l.id::text = (storage.foldername(name))[1]
    )
  );

-- Service role + authenticated users can upload to their own lease folder
CREATE POLICY "Authenticated users can upload lease documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'leases' AND auth.role() = 'authenticated');
```

**Storage path:** `{lease_id}/signature.png` and `{lease_id}/lease-signed.pdf`

---

## 3. HTML Lease Template

**File:** `src/templates/leaseTemplate.ts`

A single exported function that returns an HTML string with CSS styling, filled from lease/property/profile data.

### Template structure
```
┌─────────────────────────────────────┐
│  LOS CABOS RESIDENTIAL LEASE        │
│  AGREEMENT                          │
│                                     │
│  Date: February 14, 2026            │
│                                     │
│  PARTIES                            │
│  Landlord: Carlos Rodriguez         │
│  Tenant: Mario Polanco              │
│                                     │
│  PROPERTY                           │
│  123 Calle Marina, Cabo San Lucas   │
│                                     │
│  TERMS                              │
│  Monthly Rent: $25,000 MXN          │
│  Security Deposit: $25,000 MXN      │
│  Start Date: March 1, 2026          │
│  End Date: February 28, 2027        │
│  Duration: 12 months                │
│                                     │
│  STANDARD CLAUSES (6-7 paragraphs)  │
│  1. Rent Payment                    │
│  2. Security Deposit                │
│  3. Property Condition              │
│  4. Maintenance                     │
│  5. Termination                     │
│  6. Governing Law (BCS, Mexico)     │
│                                     │
│  SIGNATURES                         │
│  Landlord: [Approved via platform]  │
│  Tenant:   [SIGNATURE IMAGE]        │
│  Date Signed: February 14, 2026     │
└─────────────────────────────────────┘
```

### Placeholders filled from DB
- `{{LANDLORD_NAME}}` — `profiles.full_name` via `properties.landlord_id`
- `{{RENTER_NAME}}` — `profiles.full_name` via `leases.renter_id`
- `{{PROPERTY_ADDRESS}}` — `properties.address`, `properties.city`
- `{{MONTHLY_RENT}}` — `leases.monthly_rent` (formatted MXN)
- `{{DEPOSIT_AMOUNT}}` — `leases.deposit_amount` (formatted MXN)
- `{{START_DATE}}` — `leases.start_date`
- `{{END_DATE}}` — `leases.end_date`
- `{{LEASE_MONTHS}}` — calculated from dates
- `{{SIGNATURE_IMAGE}}` — base64 PNG of renter's signature
- `{{SIGNED_DATE}}` — current date

---

## 4. New route: `app/sign/[leaseId].tsx`

Full-screen signing flow (NOT a modal — this is a legal action).

**URL:** `/sign/abc-123`

### Screen structure (3 phases)

#### Phase 1: Lease Preview
```
┌─────────────────────────────────┐
│  ← Back                        │
│                                 │
│  📄 Your Lease Agreement        │
│  123 Calle Marina, Cabo        │
│                                 │
│  ┌───────────────────────────┐  │
│  │  [Scrollable lease text]  │  │
│  │  rendered from HTML       │  │
│  │  template (read-only)     │  │
│  └───────────────────────────┘  │
│                                 │
│  ☐ I have read and agree to    │
│    the terms of this lease      │
│                                 │
│  [ Sign Lease ]                 │
│                                 │
└─────────────────────────────────┘
```

- Scrollable lease text rendered via `dangerouslySetInnerHTML` in a web view div
- Checkbox must be checked before "Sign Lease" is enabled
- Tapping "Sign Lease" opens Phase 2

#### Phase 2: Signature Pad (Landscape Modal)
```
┌─────────────────────────────────────────────────┐
│                                                   │
│  Sign below                           Clear  Done │
│  ┌───────────────────────────────────────────┐   │
│  │                                           │   │
│  │     (react-signature-canvas)              │   │
│  │     white canvas, black ink               │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
└─────────────────────────────────────────────────────┘
```

- Full-screen overlay with `transform: rotate(90deg)` on mobile web to simulate landscape
- White canvas, black pen stroke (penColor: '#000', minWidth: 1.5, maxWidth: 3)
- "Clear" button resets canvas
- "Done" button captures signature as base64 PNG via `toDataURL()`
- Validates canvas is not empty before allowing "Done"

#### Phase 3: Processing + Redirect
After "Done":
1. Show full-screen loading overlay: "Generating your lease document..."
2. Generate PDF via `html2pdf.js` (fills template with data + signature)
3. Upload signature PNG to `leases/{lease_id}/signature.png`
4. Upload PDF to `leases/{lease_id}/lease-signed.pdf`
5. Update `leases` row: `signature_url`, `document_url`, `signed_at`, `status: 'active'`
6. Auto-navigate to `/pay/{leaseId}` (deposit payment screen)

---

## 5. Lease Document Service

**File:** `src/services/leaseDocumentService.ts`

### Functions

```ts
generateLeaseHtml(data: LeaseTemplateData): string
// Fills the HTML template with lease/property/profile data + signature

generateLeasePdf(html: string): Promise<Blob>
// Uses html2pdf.js to convert HTML → PDF blob

uploadSignature(leaseId: string, base64Png: string): Promise<string>
// Uploads signature PNG to Supabase Storage, returns public URL

uploadLeasePdf(leaseId: string, pdfBlob: Blob): Promise<string>
// Uploads PDF to Supabase Storage, returns public URL

finalizeLease(leaseId: string, signatureUrl: string, documentUrl: string): Promise<void>
// Updates leases row: signature_url, document_url, signed_at, status → 'active'
```

---

## 6. Integration points

### 6a. RenterLeaseDashboard — "Sign Lease" button

When `lease.status === 'sent_for_signature'`:
- Show prominent "Sign Lease" CTA button (primary color, above the deposit section)
- On press → `router.push(`/sign/${lease.id}`)`

When `lease.status === 'active'` AND `lease.document_url` exists:
- Show "View Signed Lease" button
- On press → open PDF in new browser tab (`window.open(document_url, '_blank')`)

### 6b. Auto-navigate to payment after signing

After `finalizeLease()` succeeds:
```ts
router.replace(`/pay/${leaseId}`)
```

The flow becomes: **Sign Lease → Pay Deposit → Cabo Celebration**

### 6c. Stack route in `app/_layout.tsx`

Add:
```tsx
<Stack.Screen name="sign/[leaseId]" options={{ headerShown: false, gestureEnabled: false }} />
```

---

## 7. New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260214210000_lease_signature_fields.sql` | Add signature columns + leases bucket |
| `src/templates/leaseTemplate.ts` | HTML lease template with placeholder injection |
| `src/services/leaseDocumentService.ts` | PDF generation, upload, finalize |
| `app/sign/[leaseId].tsx` | Signature flow screen (preview → sign → process) |

## 8. Modified files

| File | Change |
|------|--------|
| `package.json` | Add `react-signature-canvas`, `html2pdf.js` |
| `app/_layout.tsx` | Add `sign/[leaseId]` route |
| `src/types/database.ts` | Add `signature_url`, `document_url`, `signed_at` to Lease |
| `src/components/RenterLeaseDashboard.tsx` | Add "Sign Lease" / "View Signed Lease" buttons |

---

## 9. Execution order

1. `npm install react-signature-canvas html2pdf.js`
2. `npm install --save-dev @types/react-signature-canvas`
3. Create migration `20260214210000_lease_signature_fields.sql`
4. Push migration: `npx supabase db push`
5. Update `src/types/database.ts` — add new Lease fields
6. Create `src/templates/leaseTemplate.ts` — HTML template
7. Create `src/services/leaseDocumentService.ts` — PDF gen + upload
8. Create `app/sign/[leaseId].tsx` — signature flow screen
9. Update `app/_layout.tsx` — add sign route
10. Update `src/components/RenterLeaseDashboard.tsx` — Sign Lease + View buttons
11. Build verify: `npx expo export --platform web`

---

## 10. Demo mode

The signature flow detects `isDemo` and:
- Shows the lease preview with mock data (demo landlord, demo property)
- Signature pad works normally (real canvas capture)
- Skips Supabase upload (no storage calls)
- Simulates 1.5s processing delay
- Still auto-navigates to `/pay/{leaseId}` (which also has demo mode)

---

## 11. Complete user flow (visual)

```
Landlord moves lead to "Lease Sent"
  │
  ├─► lease-execution Edge Function creates lease record
  │     └─► status: 'sent_for_signature'
  │
  ├─► Renter sees "Sign Lease" button on dashboard
  │     └─► Taps button → /sign/{leaseId}
  │
  ├─► Phase 1: Lease Preview (scrollable text)
  │     └─► Reads terms, checks "I agree", taps "Sign Lease"
  │
  ├─► Phase 2: Signature Pad (landscape)
  │     └─► Signs with finger/mouse, taps "Done"
  │
  ├─► Phase 3: Processing
  │     ├─► Generate PDF with signature embedded
  │     ├─► Upload signature.png + lease-signed.pdf to Storage
  │     ├─► Update lease: status → 'active', signed_at, urls
  │     └─► Auto-navigate to /pay/{leaseId}
  │
  └─► Deposit Payment Flow (already built)
        └─► Pay → Cabo Celebration → Dashboard
```

---

## 12. What this plan does NOT include

- **Landlord signature** — deferred to V2 (landlord's "Send" = approval)
- **Custom lease text editing** — V2 (all leases use same template)
- **Email delivery of PDF** — V2 (renters can download/share manually)
- **Multiple lease templates** — V2 (one standard residential template)
- **Notarization / legal e-sign compliance** — V2
- **Native app signature** — web-only for now; native would use `react-native-signature-canvas`

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `html2pdf.js` output quality | Use CSS `@media print` rules; test with real lease text; fallback to `jsPDF` if quality is poor |
| Landscape signature on mobile web | Use CSS `transform: rotate(90deg)` + fixed positioning; tested pattern on mobile browsers |
| Large PDF upload (> 5MB) | Lease PDFs are text-heavy, typically < 500KB; signature PNG compressed via canvas quality param |
| react-signature-canvas + react-native-web | It's a React DOM component — renders fine on web; RN-web passes through DOM elements |
| Storage bucket permissions | RLS scoped to lease parties (renter + landlord); public bucket for simplicity but path-restricted |
| Lease status race condition | `finalizeLease` checks current status is `sent_for_signature` before updating to `active` |
