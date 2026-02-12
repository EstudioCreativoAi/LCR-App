# Move-in Date Filter - Migration Guide

## Overview
This guide explains how to add the `available_from` field to your properties table to enable move-in date filtering.

## Migration File Created
**File**: `supabase/migrations/20260212223400_add_available_from.sql`

## What This Migration Does
1. Adds a new `available_from` DATE column to the `properties` table
2. Sets the default value to `CURRENT_DATE` (today)
3. Creates an index on `available_from` for better query performance
4. Adds documentation comment

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20260212223400_add_available_from.sql`
4. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
If you have the Supabase CLI linked to your project:

```bash
# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push
```

### Option 3: Manual SQL Execution
Run this SQL directly in your Supabase SQL Editor:

```sql
-- Add available_from field to properties table
ALTER TABLE public.properties
ADD COLUMN available_from DATE DEFAULT CURRENT_DATE;

-- Add index for better query performance
CREATE INDEX idx_properties_available_from ON public.properties(available_from);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.available_from IS 'Earliest date the property is available for move-in';
```

## How the Filter Works

### In the UI
Users can select a desired move-in date using:
- **Quick options**: Today, Next Week, Next Month
- **Custom date**: (Future enhancement: native date picker)

### In the Query
The PropertyFeed component filters properties where `available_from` is on or before the selected move-in date:

```typescript
if (filters.moveInDate !== null) {
  const moveInDateStr = filters.moveInDate.toISOString().split('T')[0]
  query = query.lte('available_from', moveInDateStr)
}
```

**Example**: If a user selects "Next Week" (Feb 19, 2026), the query will return all properties where `available_from <= '2026-02-19'`.

## Updating Existing Properties

After running the migration, all existing properties will have `available_from` set to today's date. You may want to update these values:

```sql
-- Example: Set all properties to be available immediately
UPDATE public.properties
SET available_from = CURRENT_DATE;

-- Example: Set specific property availability
UPDATE public.properties
SET available_from = '2026-03-01'
WHERE id = 'YOUR_PROPERTY_ID';
```

## Testing the Feature

1. **Add test data** with different `available_from` dates:
```sql
-- Property available today
INSERT INTO public.properties (landlord_id, address, city, property_type, bedrooms, bathrooms, monthly_rent_mxn, available_from)
VALUES ('YOUR_LANDLORD_ID', 'Test Address 1', 'Cabo San Lucas', 'Apartment', 2, 1.5, 15000, CURRENT_DATE);

-- Property available next month
INSERT INTO public.properties (landlord_id, address, city, property_type, bedrooms, bathrooms, monthly_rent_mxn, available_from)
VALUES ('YOUR_LANDLORD_ID', 'Test Address 2', 'San Jose del Cabo', 'House', 3, 2, 25000, CURRENT_DATE + INTERVAL '1 month');
```

2. **Test the filter**:
   - Open the app and sign in
   - Click the filter button (⚙️)
   - Select a move-in date
   - Apply filters
   - Verify that only properties available on or before that date are shown

## Verification

After applying the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'properties' AND column_name = 'available_from';

-- Check if index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'properties' AND indexname = 'idx_properties_available_from';
```

## Rollback (if needed)

If you need to remove this feature:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_properties_available_from;

-- Remove column
ALTER TABLE public.properties DROP COLUMN IF EXISTS available_from;
```

## Future Enhancements

1. **Native Date Picker**: Install `@react-native-community/datetimepicker` for better UX
2. **Date Range**: Allow filtering for properties available within a date range
3. **Availability Calendar**: Show property availability calendar
4. **Lease Integration**: Automatically update `available_from` based on lease end dates
