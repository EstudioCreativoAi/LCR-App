# Testing Patterns

**Analysis Date:** 2026-03-07

## Test Framework

**Runner:**
- None configured. `package.json` defines: `"test": "echo \"Error: no test specified\" && exit 1"`
- No Jest, Vitest, or other test runner is installed
- No test config file exists (`jest.config.*`, `vitest.config.*`)

**Assertion Library:**
- Not applicable — no testing library installed

**Run Commands:**
```bash
npm test    # Currently exits with error: "no test specified"
```

## Test File Organization

**Location:**
- No test files exist anywhere in the codebase (`*.test.*`, `*.spec.*` — none found)

**Naming:**
- No established convention — no tests have been written

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- No test suites exist

**Patterns:**
- No setup, teardown, or assertion patterns established

## Mocking

**Framework:** None installed

**Patterns:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- No test fixtures or factory functions exist

**However, mock data is used inside components for demo/fallback mode:**
- `PropertyFeed.tsx` contains inline `mockProperties` array used when the DB is empty
- `CommissionTracker.tsx` contains `MOCK_COMMISSIONS` constant at file scope
- `LeadDashboard.tsx` contains `MOCK_LEADS` constant at file scope
- These are runtime mocks, not test fixtures

**Location:**
- Mock data is co-located inside each component file — no shared fixtures directory

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not applicable — no test runner configured
```

## Test Types

**Unit Tests:**
- Not present

**Integration Tests:**
- Not present

**E2E Tests:**
- Not present

## What Should Be Tested (Guidance for Future Tests)

Based on the codebase structure, the following areas have sufficient complexity to warrant testing once a framework is added:

**High-priority unit test targets:**
- `src/utils/currency.ts` — `formatPrice` and `formatPriceCompact` are pure functions with well-defined inputs/outputs; ideal starting point
- `src/utils/responsive.ts` — `scale`, `verticalScale`, `moderateScale` are pure math functions
- Commission calculation logic in `src/services/commissionService.ts` — `fetchCommissionStats` aggregates totals from an array

**High-priority integration test targets:**
- Service layer functions in `src/services/` — all follow the `{Domain}Result<T>` wrapper pattern, making assertions uniform
- `useAuth` hook — auth state transitions (sign-in, sign-out, sign-up) involve async state changes
- `useProperties` / `useMyProperties` hooks — CRUD operations with refetch behavior

**Recommended framework when adding tests:**
- **Vitest** — compatible with Vite-family toolchains; works with TypeScript without extra config
- **@testing-library/react-hooks** or **@testing-library/react-native** — for hook testing

**Recommended test setup pattern (matching codebase style):**
```typescript
// src/utils/currency.spec.ts
import { describe, expect, test } from 'vitest'
import { formatPrice } from './currency'

describe('formatPrice', () => {
  test('formats MXN amounts with Mexican locale', () => {
    expect(formatPrice(18500, 'MXN')).toBe('$18,500')
  })

  test('formats USD amounts with US locale', () => {
    expect(formatPrice(1000, 'USD')).toBe('$1,000')
  })
})
```

**Recommended service mock pattern (for Supabase):**
```typescript
// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    }),
  },
}))
```

---

*Testing analysis: 2026-03-07*
