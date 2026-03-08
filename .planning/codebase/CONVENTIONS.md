# Coding Conventions

**Analysis Date:** 2026-03-07

## Naming Patterns

**Files:**
- Components: PascalCase, no suffix — `PropertyFeed.tsx`, `ChatThread.tsx`, `CommissionTracker.tsx`
- Hooks: camelCase with `use` prefix — `useAuth.ts`, `useLeases.ts`, `useSavedProperties.ts`
- Services: camelCase with `Service` suffix — `propertyService.ts`, `leaseService.ts`, `authService.ts`
- Utilities: camelCase, noun-based — `currency.ts`, `responsive.ts`, `images.ts`
- Screen routes (app/): kebab-case filenames under expo-router convention — `sign-in.tsx`, `create-listing.tsx`, `edit-listing/[id].tsx`
- Type files: camelCase — `database.ts`

**Functions:**
- Named function declarations for hooks and exported components: `export function useAuth()`, `export default function PropertyFeed()`
- Arrow functions for sub-components defined inside a file: `const PropertyCard = ({ ... }) => { ... }`
- Service functions: camelCase verb-noun pattern — `fetchProperties`, `createLease`, `updateLeaseStatus`, `deleteProperty`
- Handler functions in components: camelCase with `handle` prefix — `handleInterest`, `handleScroll`
- Async state loaders inside hooks named after their action: `fetchProperties`, `fetchLeases`

**Variables:**
- camelCase throughout — `isLoading`, `sendingLead`, `searchQuery`, `showFilterModal`
- Boolean state names prefixed with `is`, `has`, `show` — `isLoading`, `isDemo`, `hasConfig`, `showFilterModal`
- Constants at module scope: SCREAMING_SNAKE_CASE — `CARD_WIDTH`, `IS_WEB`, `MAX_CONTENT_WIDTH`

**Types and Interfaces:**
- Interfaces for object shapes: `interface Property`, `interface Lease`, `interface PropertyFilters`
- Types for unions/literals: `type UserRole = 'renter' | 'landlord' | 'agent'`, `type LeaseStatus = '...'`
- Result wrappers named `{Domain}Result<T>`: `PropertyResult<T>`, `LeaseResult<T>`, `CommissionResult<T>`
- Hook return types named `Use{Domain}Return`: `UseAuthReturn`, `UsePropertiesReturn`, `UseLeasesReturn`
- Params types for service inputs: `CreatePropertyParams`, `CreateLeaseParams`, `SignUpParams`
- DB row/insert/update triplets: `Profile` / `ProfileInsert` / `ProfileUpdate`

## Code Style

**Formatting:**
- No Prettier config file present; code uses consistent 2-space indentation throughout
- Single quotes for strings in TypeScript/TSX
- Trailing commas in multi-line objects and arrays
- No semicolons at end of statements (most files) — some legacy files have them

**Linting:**
- No ESLint config detected in the root
- TypeScript strict mode enabled via `tsconfig.json` (`"strict": true`)
- Numerous `as any` casts exist (30+) — strict mode is declared but not fully enforced by type-checking discipline

## Import Organization

**Order (observed pattern):**
1. React and React Native core imports
2. Third-party library imports (`@supabase/supabase-js`, `react-i18next`, `lucide-react-native`)
3. Internal absolute-path imports from `src/` layers (services, hooks, providers, theme, types, utils)
4. Sibling/relative component imports

**Type-only imports:**
- `import type { Session, User }` pattern is used for type-only imports in hooks and services
- `import type { ... }` is consistently used in `useAuth.ts`, `useProperties.ts`, `useLeases.ts`, and `SessionProvider.tsx`

**Path Aliases:**
- No path aliases configured; all imports use relative paths (`../services/`, `../../src/components/`)

**Barrel files:**
- `src/hooks/index.ts` re-exports all hooks via `export * from './useAuth'`
- `src/services/index.ts` re-exports all services via `export * from './authService'`

## Error Handling

**Service layer pattern (consistent):**
All service functions return a typed result wrapper object — never throw:
```typescript
export interface PropertyResult<T> {
  success: boolean
  data?: T
  error?: string
}

// Usage:
try {
  const { data, error } = await supabase.from('properties').select(...)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as PropertyWithImages[] }
} catch (err) {
  return {
    success: false,
    error: err instanceof Error ? err.message : 'Failed to fetch properties',
  }
}
```

**Hook layer pattern (consistent):**
Hooks read `result.success` and set local `error: string | null` state:
```typescript
const result = await propertyService.fetchProperties(currentFilters)
if (result.success && result.data) {
  setProperties(result.data)
} else {
  setError(result.error ?? 'Failed to fetch properties')
}
```

**Component layer pattern (inconsistent):**
Some components (e.g. `PropertyFeed.tsx`, `ChatThread.tsx`) bypass the service/hook layer and call Supabase directly inside `useCallback`, wrapping in try/catch and calling `console.error`. This diverges from the service pattern.

**Payment service exception:**
`paymentService.ts` throws errors directly (does not use a result wrapper), unlike all other services. Callers must use try/catch.

## Logging

**Framework:** `console.log` / `console.error` / `console.warn` — no structured logging library

**Patterns:**
- Namespace prefix in brackets for traceability: `console.log('[Session] onAuthStateChange:', ...)`, `console.error('[Lead] insert error:', ...)`
- `console.error` used for caught exceptions in both services and components
- Debug `console.log` statements present in production paths (e.g. `SessionProvider.tsx`, `paymentService.ts`) — not stripped in builds
- No log levels or environment-based log filtering

## Comments

**When to Comment:**
- JSDoc used on utility functions in `src/utils/` — `currency.ts` and `responsive.ts` have `/** ... */` block comments on every exported function
- Inline comments used sparingly for non-obvious logic (e.g. `// Get fresh session token to avoid stale JWT 401s`)
- Section comments used to label mock/fallback data blocks: `// Fallback mock data for a WOW factor if DB is empty`

**JSDoc/TSDoc:**
- Only used in `src/utils/currency.ts` and `src/utils/responsive.ts`
- Not used on service or hook functions

## Function Design

**Size:** Hook fetch functions are concise (10–25 lines). Component event handlers are longer and sometimes exceed 40 lines when they contain inline Supabase calls.

**Parameters:** Services accept typed params interfaces for multi-parameter operations (e.g. `CreatePropertyParams`, `SignUpParams`). Simple operations use positional parameters.

**Return Values:**
- Services return `{Domain}Result<T>` wrapper objects
- Hooks return typed `Use{Domain}Return` interface objects
- Component handlers return `void` or `Promise<boolean>`

## Module Design

**Exports:**
- Services use named function exports (no default exports)
- Components use `export default function` for the primary component
- Sub-components defined at the top of a file (e.g. `PropertyCard` in `PropertyFeed.tsx`) use `const` arrow functions and are not exported
- Types/interfaces are exported inline alongside the functions that use them

**Barrel Files:**
- `src/hooks/index.ts` and `src/services/index.ts` are barrel files that re-export everything
- No barrel file for `src/components/` — components are imported directly

## Theme Usage

**Always import design tokens from `src/theme/theme.ts`:**
```typescript
import { COLORS, SPACING, FONTS } from '../theme/theme'
```

**StyleSheet pattern:**
All component styles are defined at the bottom of the file in a single `const styles = StyleSheet.create({})` block. Style keys use camelCase.

**Web-specific styles:**
Web-only properties (e.g. `outlineStyle: 'none'`) are cast with `as any` or wrapped in a `Platform.OS === 'web'` conditional.

---

*Convention analysis: 2026-03-07*
