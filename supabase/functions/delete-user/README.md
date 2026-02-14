# Delete User

Edge Function that deletes a user account and all related data.

## Flow

1. **Log to audit_logs** – Records the deletion event (action: `user.deleted`) with metadata: target user, properties/leads counts.
2. **Purge property-photos** – Removes all files in `property-photos/{userId}/` (landlord folders).
3. **Delete from auth.users** – Triggers cascades: profile → properties, leads, leases, etc.

## Usage

```ts
const { data: { session } } = await supabase.auth.getSession()
const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
})
```

Self-deletion only: the authenticated user can delete their own account. Optional `user_id` in body must match the caller.

## Responses

- **200**: User deleted. Body includes metadata (properties_deleted, leads_deleted, storage_files_deleted).
- **401**: Missing or invalid token.
- **403**: Attempt to delete another user.
- **500**: Server error (includes audit log on deletion_failed).
