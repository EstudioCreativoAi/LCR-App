# PropertyFeed Component

## Overview
The `PropertyFeed` component displays a scrollable list of active rental properties with high-performance rendering using FlashList. It includes search functionality, photo carousels, and detailed property information.

## Features

### ✅ High-Performance Scrolling
- Uses **FlashList** from `@shopify/flash-list` for optimized rendering of large lists
- Estimated item size: 350px for smooth scrolling

### ✅ Photo Carousel
- Horizontal scrollable photo gallery for each property
- Visual indicators showing current photo position
- Smooth page-based scrolling
- Fallback to placeholder images if no photos are available

### ✅ Search Functionality
- Search bar at the top to filter properties by city name
- Real-time filtering using Supabase's `ilike` query
- Clear button to reset search

### ✅ Advanced Filters
- Price range filtering
- Bedroom count filtering
- Move-in date filtering
- Filter badge showing active filter count

### ✅ Property Information Display
- **Price**: Formatted in Mexican Pesos (MXN) with monthly label
- **Location**: City and full address
- **Property Details**: 
  - Bedroom count with icon
  - Bathroom count with icon
  - Property type

## Data Source
Fetches properties from the Supabase `properties` table where:
- `status = 'active'`
- Ordered by `created_at` (newest first)

## Usage

```tsx
import PropertyFeed from '../components/PropertyFeed'

function HomeScreen() {
  return <PropertyFeed />
}
```

## Dependencies
- `@shopify/flash-list` - High-performance list rendering
- `@supabase/supabase-js` - Database queries
- `react-native` - Core components

## Photo URLs
Currently using placeholder images from `picsum.photos`. Replace with actual photo URLs from your storage:

```typescript
// In the renderPropertyCard function, update:
const photos = item.photos && item.photos.length > 0 
  ? item.photos 
  : [/* your default photos */]
```

## Styling
- Modern iOS-inspired design
- Card-based layout with shadows
- Responsive to screen width
- Clean typography with proper hierarchy

## Performance Considerations
- FlashList only renders visible items
- Images are loaded lazily
- Efficient re-renders with proper key extraction
- Optimized search with debounced queries (via Supabase)

## Future Enhancements
- [ ] Add property detail view on card tap
- [ ] Implement favorites/bookmarks
- [ ] Add map view toggle
- [ ] Virtual tours integration
- [ ] Share property functionality
