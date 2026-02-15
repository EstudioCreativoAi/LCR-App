# PLAN: Replace All Icons & Emojis with Lucide React Native

## Overview
Replace all emoji characters and Unicode symbols across 13 files with proper `lucide-react-native` SVG icon components. This gives the app a consistent, premium, "modern app" feel.

## Step 0 — Install Dependencies
```bash
npx expo install lucide-react-native react-native-svg
```

## Step 1 — Tab Bar Icons (`app/(tabs)/_layout.tsx`)
Add `tabBarIcon` to all 8 `<Tabs.Screen>` using the user-specified mapping:

| Tab | Lucide Icon |
|-----|------------|
| Home (index) | `Home` |
| Search | `Search` |
| Saved | `Heart` |
| My Listings | `Building` |
| Leads | `Users` |
| Leases | `FileText` |
| Commissions | `Banknote` |
| Profile | `User` |

- Active color: `COLORS.primary` (already set via `tabBarActiveTintColor`)
- Inactive color: `COLORS.muted` (already set via `tabBarInactiveTintColor`)
- Replace `🔔` notification bell with `<Bell>` icon.

## Step 2 — PropertyFeed (`src/components/PropertyFeed.tsx`)
| Current | Replacement |
|---------|-------------|
| `🛌` bed icon | `<BedDouble>` |
| `🚿` bath icon | `<ShowerHead>` |
| `★` rating text | `<Star>` (filled via `fill` prop) |
| `🔍` search icon | `<Search>` |
| `✕` clear search | `<X>` with hitSlop |
| `⚙️` filter icon | `<SlidersHorizontal>` |
| `🏠` empty state | `<Home>` (size 64) |

## Step 3 — PropertyDetail (`src/components/PropertyDetail.tsx`)
| Current | Replacement |
|---------|-------------|
| `✕ Close` back button | `<X>` + "Close" text |
| `★` rating badges | `<Star>` (filled) |
| `🛌` bedroom stat | `<BedDouble>` |
| `🚿` bathroom stat | `<ShowerHead>` |
| `🏠` property type | `<Home>` |

## Step 4 — ReviewSystem (`src/components/ReviewSystem.tsx`)
| Current | Replacement |
|---------|-------------|
| `★` / `☆` interactive stars | `<Star>` with conditional `fill` prop and `color` |

Layout change: Stars go from `<Text>` inside `<TouchableOpacity>` to `<Star>` SVG components in a flex row. The `starIcon` fontSize style gets replaced with `size` prop (40).

## Step 5 — RenterLeaseDashboard (`src/components/RenterLeaseDashboard.tsx`)
| Current | Replacement |
|---------|-------------|
| `📍` address prefix | `<MapPin>` inline |
| `✍️` sign lease button | `<PenLine>` |
| `✓` deposit paid check | `<Check>` |
| `📄` / `📝` action icons | `<FileText>` / `<FilePen>` |
| `💬` chat action | `<MessageCircle>` |
| `★` rate button | `<Star>` |
| `🏢` empty state | `<Building>` (size 64) |

## Step 6 — NotificationCenter (`src/components/NotificationCenter.tsx`)
| Current | Replacement |
|---------|-------------|
| `💬` new_message icon | `<MessageCircle>` |
| `📈` lead_update icon | `<TrendingUp>` |
| `📝` lease_signed icon | `<FilePen>` |
| `🔔` default icon | `<Bell>` |
| `📭` empty state | `<BellOff>` (size 48) |

## Step 7 — LeadDashboard (`src/components/LeadDashboard.tsx`)
| Current | Replacement |
|---------|-------------|
| `💬 Chat` button text | `<MessageCircle>` + "Chat" |
| `✅ Complete...` button | `<CheckCircle>` + text |
| `📈` empty state | `<TrendingUp>` (size 64) |

## Step 8 — CommissionTracker (`src/components/CommissionTracker.tsx`)
| Current | Replacement |
|---------|-------------|
| `💸` empty state | `<Banknote>` (size 64) |

## Step 9 — CreateListing (`src/components/CreateListing.tsx`)
| Current | Replacement |
|---------|-------------|
| `📸` upload photo icon | `<Camera>` |
| `✕` close button | `<X>` |

## Step 10 — CaboCelebration (`src/components/CaboCelebration.tsx`)
| Current | Replacement |
|---------|-------------|
| `🔑` key icon | `<Key>` (size 80, color white) |
| `🏠` house icon | `<Home>` (size 80, color white) |

## Step 11 — SearchFilterModal (`src/components/SearchFilterModal.tsx`)
| Current | Replacement |
|---------|-------------|
| `✕` close button | `<X>` |
| `📅` calendar icon | `<Calendar>` |

## Step 12 — sign/[leaseId].tsx (`app/sign/[leaseId].tsx`)
| Current | Replacement |
|---------|-------------|
| `✍️` processing pen | `<PenLine>` |
| `✕` cancel button | `<X>` |
| `✓` checkbox checkmark | `<Check>` |
| `✍️` sign button icon | `<PenLine>` |

## Step 13 — pay/[leaseId].tsx (`app/pay/[leaseId].tsx`)
| Current | Replacement |
|---------|-------------|
| `🏠` hero placeholder | `<Home>` (size 48, color white) |

## Global Conventions
- **strokeWidth:** `2` everywhere
- **Icon size defaults:** 20-24 for inline, 48-64 for empty states, 80 for celebration
- **Colors:** Inherit from context. Use `color` prop to pass existing theme colors. Never hardcode new colors.
- **hitSlop:** All close/cancel `<X>` buttons get `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` for mobile usability.
- **Style changes:** Where emojis were rendered as `<Text style={{ fontSize: N }}>`, the `<Text>` wrapper is removed and replaced directly with the Lucide component. Corresponding `fontSize`-based styles become unused and will be cleaned up.

## Files Touched (13 total)
1. `app/(tabs)/_layout.tsx`
2. `src/components/PropertyFeed.tsx`
3. `src/components/PropertyDetail.tsx`
4. `src/components/ReviewSystem.tsx`
5. `src/components/RenterLeaseDashboard.tsx`
6. `src/components/NotificationCenter.tsx`
7. `src/components/LeadDashboard.tsx`
8. `src/components/CommissionTracker.tsx`
9. `src/components/CreateListing.tsx`
10. `src/components/CaboCelebration.tsx`
11. `src/components/SearchFilterModal.tsx`
12. `app/sign/[leaseId].tsx`
13. `app/pay/[leaseId].tsx`
