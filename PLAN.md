# PLAN: Edit Profile with Flip-Card UX

**Status:** Awaiting approval
**Scope:** Wire up Edit Profile on the Cabo ID Card — DB migration, avatar uploads, flip-card animation, stamp effect

---

## 1. Install dependency

```bash
npm install react-native-reanimated
```

`expo-image-picker` and `expo-image-manipulator` are already installed. `babel.config.js` already has `babel-preset-expo` which includes the Reanimated plugin for SDK 54.

---

## 2. Supabase migration: `20260214100000_profile_edit_fields.sql`

### 2a. Add columns to `profiles`

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;
```

### 2b. Backfill `first_name` / `last_name` from existing `full_name`

```sql
UPDATE public.profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name  = NULLIF(substring(full_name from position(' ' in full_name) + 1), '')
WHERE full_name IS NOT NULL AND first_name IS NULL;
```

### 2c. Create computed column or keep `full_name` as-is?

**Decision: Keep `full_name` column.** 20+ references across the codebase use `full_name`. We'll add a trigger that auto-updates `full_name` when `first_name` or `last_name` change, so existing code doesn't break:

```sql
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_full_name_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_full_name();
```

### 2d. Backfill `email` from `auth.users`

```sql
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
```

### 2e. Update `handle_new_user()` to populate email on signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email)
  VALUES (NEW.id, 'renter', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Supabase migration: `20260214100100_create_avatars_bucket.sql`

```sql
-- Create avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users manage their own folder: {user_id}/*
CREATE POLICY "Users Manage Own Avatar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 4. Update TypeScript types (`src/types/database.ts`)

Add new fields to `Profile`, `ProfileInsert`, `ProfileUpdate`:

```ts
export interface Profile {
  id: string
  role: UserRole
  full_name: string | null    // kept — auto-synced by trigger
  first_name: string | null   // NEW
  last_name: string | null    // NEW
  email: string | null        // NEW (denormalized)
  phone_number: string | null // NEW
  bio: string | null          // NEW
  avatar_url: string | null
  created_at: string
  updated_at: string
}
```

---

## 5. Create profile service (`src/services/profileService.ts`)

New service with:

```
fetchProfile(userId)       → SELECT * FROM profiles WHERE id = userId
updateProfile(userId, data) → UPDATE profiles SET ... WHERE id = userId
uploadAvatar(userId, imageUri) → pick 1:1, compress, upload to avatars/{userId}/avatar.jpg, return publicUrl
```

`uploadAvatar` reuses `processImageForUpload` and `uploadImageToStorage` from `src/utils/images.ts` but with a 1:1 aspect ratio for the picker.

---

## 6. Flip-Card UX on `profile.tsx`

### Architecture

The ID card becomes a **FlipCard** component with two faces:

```
<FlipCard flipped={isEditing}>
  <CardFront>         ← Current ID card UI (read-only)
    [Edit button on top-right]
  </CardFront>
  <CardBack>          ← Edit form
    [Avatar tap-to-change]
    [First Name input]
    [Last Name input]
    [Phone input (placeholder: "+52...")]
    [Bio textarea]
    [Cancel] [Save]
  </CardBack>
</FlipCard>
```

### Animation spec (react-native-reanimated)

- **Flip:** `withTiming` rotateY from 0° to 180° (500ms, Easing.inOut)
- Front face: `backfaceVisibility: 'hidden'`, rotateY = `interpolate(progress, [0,1], [0, 180])`
- Back face: `backfaceVisibility: 'hidden'`, rotateY = `interpolate(progress, [0,1], [180, 360])`
- Both faces share the same `LinearGradient` background so the card feels like one physical object

### "Stamp" animation on save

After successful save + flip back to front:
1. A circular "VERIFIED" stamp overlay scales from 0 → 1.2 → 1.0 with a spring animation
2. Opacity fades from 1 → 0 over 1.5s
3. Only plays if the profile now meets verification criteria (first_name + last_name + avatar_url all set)
4. If not verified yet, skip the stamp — just flip back normally

### Avatar editing

- Tapping the avatar on the back face calls `pickImage()` with `aspect: [1, 1]`
- Shows a loading spinner overlay on the avatar circle during upload
- On success, updates the avatar preview immediately (optimistic UI)

---

## 7. Files to create/modify

| File | Action |
|------|--------|
| `supabase/migrations/20260214100000_profile_edit_fields.sql` | Create |
| `supabase/migrations/20260214100100_create_avatars_bucket.sql` | Create |
| `src/types/database.ts` | Add `first_name`, `last_name`, `email`, `phone_number`, `bio` to Profile types |
| `src/services/profileService.ts` | Create (fetch, update, uploadAvatar) |
| `src/utils/images.ts` | Add `pickAvatarImage()` variant with 1:1 aspect |
| `app/(tabs)/profile.tsx` | Major rewrite — FlipCard with edit form + stamp animation |

---

## 8. Execution order

1. `npm install react-native-reanimated`
2. Create migration `20260214100000_profile_edit_fields.sql`
3. Create migration `20260214100100_create_avatars_bucket.sql`
4. Update `src/types/database.ts` with new profile fields
5. Create `src/services/profileService.ts`
6. Add `pickAvatarImage()` to `src/utils/images.ts`
7. Rewrite `app/(tabs)/profile.tsx` with FlipCard + edit form + stamp animation
8. Build verify: `npx expo export --platform web`

---

## 9. What this plan does NOT change

- No changes to existing components (LeadDashboard, ChatThread, etc.) — they continue using `full_name` which is auto-synced by the trigger
- No changes to authService or SessionProvider
- No OTP/phone verification (V2)
- No changes to navigation structure

---

## 10. Verification criteria ("Verified" badge)

The holographic "VERIFIED" stamp appears when ALL of these are true:
- `first_name` IS NOT NULL and non-empty
- `last_name` IS NOT NULL and non-empty
- `avatar_url` IS NOT NULL and non-empty

`phone_number` and `bio` are encouraged but do NOT block verification.

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `full_name` references break | Trigger auto-syncs `full_name` from `first_name + last_name` — zero code changes needed in existing components |
| Reanimated web compatibility | react-native-reanimated v3 supports web; Expo SDK 54 includes the babel plugin |
| Avatar upload fails silently | Show error Alert + keep old avatar; optimistic UI reverts on failure |
| Migration fails on existing data | Backfill queries handle NULL safely with COALESCE |
| `backfaceVisibility` on web | Supported in react-native-web via CSS `backface-visibility: hidden` |
