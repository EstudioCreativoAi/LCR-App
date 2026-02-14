# Rate Limit Middleware

Edge Function that enforces a 50-requests-per-24-hours limit per authenticated user. Uses the `api_usage` table to store request counts.

## Usage

### As a pre-check

Call this function before protected operations. If it returns 200, proceed; if 429, block the request.

```ts
const { data: { session } } = await supabase.auth.getSession()
const res = await fetch(
  `${SUPABASE_URL}/functions/v1/rate-limit-middleware`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }
)
if (res.status === 429) {
  throw new Error('Rate limit exceeded')
}
// Proceed with the actual API call
```

### From other Edge Functions

At the start of a protected Edge Function, invoke this middleware with the incoming request's Authorization header. If it returns 429, forward that response to the client.

## Responses

- **200**: Request allowed. Body: `{ allowed: true, remaining: number }`
- **401**: Missing or invalid Authorization header
- **429**: Rate limit exceeded. Body includes `retry_after` (seconds). `Retry-After` header set.
