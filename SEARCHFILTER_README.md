# SearchFilter Modal Implementation

## Overview
The SearchFilter modal provides comprehensive filtering capabilities for the PropertyFeed component, allowing users to filter properties by:
- **Price Range (MXN)**: Dual sliders for minimum and maximum price
- **Bedrooms**: Quick-select buttons (1, 2, 3+)
- **Move-in Date**: Date picker with quick-select options

## Components Created

### 1. SearchFilterModal.tsx
Located at: `src/components/SearchFilterModal.tsx`

**Features:**
- Modal overlay with slide-up animation
- Price range sliders with real-time MXN formatting
- Bedroom selection buttons (1, 2, 3+)
- Move-in date picker with quick-select options (Today, Next Week, Next Month)
- Reset and Apply buttons
- Active filter count badge

**Props:**
```typescript
interface SearchFilterModalProps {
  visible: boolean              // Controls modal visibility
  onClose: () => void           // Callback when modal is closed
  onApply: (filters: SearchFilters) => void  // Callback with selected filters
  initialFilters?: SearchFilters // Optional initial filter values
}
```

**Filter Interface:**
```typescript
interface SearchFilters {
  priceMin: number              // Minimum price in MXN
  priceMax: number              // Maximum price in MXN
  bedrooms: number | null       // Number of bedrooms (4 = 3+)
  moveInDate: Date | null       // Desired move-in date
}
```

### 2. PropertyFeed.tsx
Located at: `src/components/PropertyFeed.tsx`

**Features:**
- Fetches active properties from Supabase
- City search with real-time filtering
- Integrates SearchFilterModal
- Displays filter count badge
- Property cards with:
  - Photo carousel placeholder
  - Price in MXN
  - Address and city
  - Bedroom/bathroom count
  - Property type

**Supabase Query Logic:**
```typescript
// Base query for active properties
let query = supabase
  .from('properties')
  .select('*')
  .eq('status', 'active')

// City search filter
if (searchQuery.trim()) {
  query = query.ilike('city', `%${searchQuery.trim()}%`)
}

// Price range filter
query = query
  .gte('monthly_rent_mxn', filters.priceMin)
  .lte('monthly_rent_mxn', filters.priceMax)

// Bedrooms filter
if (filters.bedrooms !== null) {
  if (filters.bedrooms === 4) {
    // 3+ bedrooms
    query = query.gte('bedrooms', 3)
  } else {
    query = query.eq('bedrooms', filters.bedrooms)
  }
}

// Move-in date filter
if (filters.moveInDate !== null) {
  // Filter properties available on or before the desired move-in date
  const moveInDateStr = filters.moveInDate.toISOString().split('T')[0]
  query = query.lte('available_from', moveInDateStr)
}
```

## Dependencies Installed

```bash
npm install @react-native-community/slider
```

## Usage Example

The PropertyFeed component is already integrated into the App.tsx HomeScreen:

```typescript
import PropertyFeed from './components/PropertyFeed'

function HomeScreen({ session }: { session: Session }) {
  return (
    <SafeAreaView style={styles.homeContainer}>
      <View style={styles.header}>
        {/* Header content */}
      </View>
      <PropertyFeed />
    </SafeAreaView>
  )
}
```

## Future Enhancements

1. **Date Picker**: Consider installing `@react-native-community/datetimepicker` for a native date picker experience
2. **Photo Carousel**: Implement actual image carousel with swipe gestures
3. **Additional Filters**: 
   - Bathrooms count
   - Property type
   - Amenities
4. **Move-in Date Query**: Add database field and query logic for available move-in dates
5. **Saved Searches**: Allow users to save filter combinations
6. **Sort Options**: Price (low to high, high to low), newest, etc.

## Database Schema

The component queries the `properties` table with the following relevant fields:
- `id`: UUID
- `address`: TEXT
- `city`: TEXT
- `bedrooms`: INTEGER
- `bathrooms`: NUMERIC(3, 1)
- `monthly_rent_mxn`: NUMERIC(12, 2)
- `status`: ENUM ('active', 'rented', 'paused')
- `property_type`: TEXT

## Styling

The components follow iOS design patterns with:
- SF Pro-inspired typography
- iOS color palette (#007AFF for primary, #FF3B30 for destructive)
- Smooth animations and transitions
- Proper spacing and padding
- Accessible touch targets (minimum 48x48)
