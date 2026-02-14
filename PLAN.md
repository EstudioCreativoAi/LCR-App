# PLAN: Migrate to expo-router file-based routing

**Status:** Awaiting approval
**Scope:** Replace manual `useState`-based navigation in `App.tsx` with `expo-router` file-based routing

---

## 1. Install dependencies

```bash
npm install expo-router expo-linking expo-constants expo-status-bar
```

`react-native-safe-area-context`, `react-native-screens`, and `react-native-gesture-handler` are already installed.

---

## 2. Update config files

### `app.json`
- Add `"scheme": "lcr-app"` for deep linking
- Set `"web.bundler": "metro"`
- Set `"web.output": "single"` (SPA mode for Vercel)

### `package.json`
- Change `"main"` from `"index.js"` to `"expo-router/entry"`
- Update `"build"` script to `"expo export --platform web"`

### `tsconfig.json`
- Add `"compilerOptions.baseUrl": "."` (required by expo-router path aliases)

### `vercel.json`
- No changes needed (SPA rewrite already handles client-side routing)

### `babel.config.js`
- Create file with `babel-preset-expo` (expo-router requires it)

---

## 3. New directory structure

```
app/
├── _layout.tsx              # Root layout: loads fonts, wraps SessionProvider, Slot
├── (auth)/
│   ├── _layout.tsx          # Stack navigator for auth group
│   └── sign-in.tsx          # Refactored AuthScreen (URL: /sign-in)
├── (tabs)/
│   ├── _layout.tsx          # Bottom tab navigator, role-conditional tabs
│   ├── index.tsx            # Home/Feed tab (URL: /)
│   ├── search.tsx           # Search tab placeholder (URL: /search)
│   ├── saved.tsx            # Renter: Saved/Favorites (URL: /saved)
│   ├── my-listings.tsx      # Landlord/Agent: My Listings (URL: /my-listings)
│   ├── leads.tsx            # Landlord/Agent: Lead Dashboard (URL: /leads)
│   ├── commissions.tsx      # Agent only: Commission Tracker (URL: /commissions)
│   ├── leases.tsx           # Renter: My Leases (URL: /leases)
│   └── profile.tsx          # Profile placeholder (URL: /profile)
├── listing/
│   └── [id].tsx             # Property detail (URL: /listing/123)
├── create-listing.tsx       # Modal: Create Listing (presentation: 'modal')
└── notifications.tsx        # Modal: Notification Center (presentation: 'modal')

src/
├── components/              # Existing components stay here (no moves needed)
├── hooks/
├── services/
├── providers/
│   └── SessionProvider.tsx   # NEW: auth + demo mode context
├── types/
├── theme/
├── i18n/
├── lib/
└── utils/
```

**Key:** Components stay in `src/components/`. The `app/` directory only has thin route files that import from `src/`.

---

## 4. SessionProvider (new file: `src/providers/SessionProvider.tsx`)

Replaces all auth/demo logic currently in `App.tsx`:

```
SessionProvider
├── session: Session | null
├── role: UserRole | null
├── isDemo: boolean
├── isLoading: boolean
├── enterDemo(role) → sets mock session + role
├── signOut() → clears session or calls supabase.auth.signOut()
```

- Wraps the entire app in `app/_layout.tsx`
- All route files access session via `useSession()` hook
- Auth redirect logic lives in `app/_layout.tsx`: if no session, redirect to `/(auth)/sign-in`

---

## 5. Root layout (`app/_layout.tsx`)

Responsibilities:
1. Load Poppins fonts (moved from old `App.tsx`)
2. Wrap children in `<SessionProvider>`
3. Show loading spinner until fonts + session are ready
4. Define the root `<Stack>` with:
   - `(auth)` group — visible when unauthenticated
   - `(tabs)` group — visible when authenticated
   - `create-listing` — `presentation: 'modal'`
   - `notifications` — `presentation: 'modal'`
   - `listing/[id]` — standard push screen

Auth gate: Use `useEffect` + `router.replace()` to redirect based on session state (not conditional rendering, since expo-router manages the navigation tree).

---

## 6. Tabs layout (`app/(tabs)/_layout.tsx`)

Role-conditional bottom tabs:

| Tab | Renter | Landlord | Agent |
|-----|--------|----------|-------|
| Home (Feed) | Yes | Yes | Yes |
| Search | Yes | Yes | Yes |
| Saved | Yes | No | No |
| My Listings | No | Yes | Yes |
| Leads | No | Yes | Yes |
| Leases | Yes | No | No |
| Commissions | No | No | Yes |
| Profile | Yes | Yes | Yes |

Implementation: Use `<Tabs>` from `expo-router` with `href: null` to hide tabs based on `role` from `useSession()`.

---

## 7. Route file pattern

Each route file is thin — it imports the existing component and passes props:

```tsx
// app/(tabs)/leads.tsx
import LeadDashboard from '../../src/components/LeadDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeadsScreen() {
  const { session, isDemo } = useSession()
  if (!session) return null
  return <LeadDashboard isDemo={isDemo} session={session} />
}
```

---

## 8. Files modified

| File | Action |
|------|--------|
| `package.json` | Change `main`, add expo-router dep |
| `app.json` | Add scheme, web config |
| `tsconfig.json` | Add baseUrl |
| `index.js` | Delete (replaced by expo-router/entry) |
| `src/App.tsx` | Delete (replaced by `app/_layout.tsx`) |
| `src/screens/AuthScreen.tsx` | Refactor: remove `onEnterDemo` prop, use `useSession()` context instead |
| `babel.config.js` | Create |

---

## 9. Migration steps (execution order)

1. Install `expo-router` + peers
2. Create `babel.config.js`
3. Update `app.json`, `package.json`, `tsconfig.json`
4. Create `src/providers/SessionProvider.tsx`
5. Create `app/_layout.tsx` (root)
6. Create `app/(auth)/_layout.tsx` + `app/(auth)/sign-in.tsx`
7. Create `app/(tabs)/_layout.tsx` + all tab route files
8. Create `app/listing/[id].tsx`, `app/create-listing.tsx`, `app/notifications.tsx`
9. Create `app/(tabs)/profile.tsx` placeholder
10. Refactor `AuthScreen.tsx` to use `useSession()` instead of props
11. Delete `index.js` and `src/App.tsx`
12. Test: `npx expo start --web` to verify routing works
13. Test: verify demo mode still works end-to-end

---

## 10. What this plan does NOT change

- No component refactoring (PropertyFeed, LeadDashboard, etc. stay as-is)
- No styling changes
- No new features beyond navigation scaffolding
- No database/migration changes
- `src/hooks/`, `src/services/`, `src/lib/`, `src/utils/`, `src/theme/`, `src/i18n/` are untouched

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| expo-router v4 requires Expo SDK 54 | Already on SDK 54 — compatible |
| `react-native-web` compatibility | expo-router supports web output; using `"output": "single"` SPA mode |
| Existing `@react-navigation` packages conflict | expo-router uses react-navigation internally; will keep existing deps (they're peers) |
| Demo mode breaks after refactor | SessionProvider preserves exact same mock session logic |
| Vercel deploys break | SPA rewrite in vercel.json already handles `/(.*) → /index.html` |
