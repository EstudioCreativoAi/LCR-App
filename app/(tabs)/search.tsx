import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../src/lib/supabase'
import { COLORS, SPACING, FONTS } from '../../src/theme/theme'
import type { Property as DBProperty } from '../../src/types/database'
import SearchFilterModal from '../../src/components/SearchFilterModal'
import type { SearchFilters } from '../../src/components/SearchFilterModal'
import { formatPrice } from '../../src/utils/currency'
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  BedDouble,
  ShowerHead,
  Star,
  Home,
  Calendar,
  Heart,
} from 'lucide-react-native'
import { useSavedProperties } from '../../src/hooks/useSavedProperties'
import { useSession } from '../../src/providers/SessionProvider'

interface PropertyWithRating extends DBProperty {
  avg_rating?: number
  review_count?: number
}

const DEFAULT_FILTERS: SearchFilters = {
  priceMin: 0,
  priceMax: 100000,
  bedrooms: null,
  moveInDate: null,
}

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'
const CARD_WIDTH = IS_WEB
  ? Math.min(WINDOW_WIDTH - 32, MAX_CONTENT_WIDTH)
  : WINDOW_WIDTH - 32

function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.priceMin > 0 ||
    filters.priceMax < 100000 ||
    filters.bedrooms !== null ||
    filters.moveInDate !== null
  )
}

function countActiveFilters(filters: SearchFilters): number {
  let count = 0
  if (filters.priceMin > 0 || filters.priceMax < 100000) count++
  if (filters.bedrooms !== null) count++
  if (filters.moveInDate !== null) count++
  return count
}

function formatChipDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
  })
}

export default function SearchScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { session, role } = useSession()
  const { toggleSave, isPropertySaved } = useSavedProperties(session?.user?.id ?? null)
  const [properties, setProperties] = useState<PropertyWithRating[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('properties').select('*').eq('status', 'active')

      if (searchQuery.trim()) {
        query = query.or(
          `address.ilike.%${searchQuery.trim()}%,city.ilike.%${searchQuery.trim()}%`
        )
      }

      query = query
        .gte('monthly_rent_mxn', filters.priceMin)
        .lte('monthly_rent_mxn', filters.priceMax)

      if (filters.bedrooms !== null) {
        if (filters.bedrooms === 4) {
          query = query.gte('bedrooms', 3)
        } else {
          query = query.eq('bedrooms', filters.bedrooms)
        }
      }

      if (filters.moveInDate !== null) {
        const moveInDateStr = filters.moveInDate.toISOString().split('T')[0]
        query = query.lte('available_from', moveInDateStr)
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      })

      if (!error && data && data.length > 0) {
        const propertyIds = data.map((p: any) => p.id)
        const { data: ratingsData } = await (
          supabase.from('ratings') as any
        )
          .select('property_id, rating')
          .in('property_id', propertyIds)
          .eq('category', 'property')

        const withRatings: PropertyWithRating[] = data.map((p: any) => {
          const pRatings =
            ratingsData?.filter((r: any) => r.property_id === p.id) || []
          const avg =
            pRatings.length > 0
              ? pRatings.reduce((acc: number, r: any) => acc + r.rating, 0) /
                pRatings.length
              : undefined
          return {
            ...p,
            avg_rating: avg,
            review_count: pRatings.length,
          }
        })
        setProperties(withRatings)
      } else {
        setProperties([])
      }
    } catch (err) {
      console.error('Error fetching search properties:', err)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filters])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProperties()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchProperties])

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters)
  }

  const removePriceFilter = () => {
    setFilters((prev) => ({ ...prev, priceMin: 0, priceMax: 100000 }))
  }

  const removeBedroomFilter = () => {
    setFilters((prev) => ({ ...prev, bedrooms: null }))
  }

  const removeDateFilter = () => {
    setFilters((prev) => ({ ...prev, moveInDate: null }))
  }

  const handleCardPress = (property: PropertyWithRating) => {
    router.push(`/listing/${property.id}`)
  }

  const renderFilterChips = () => {
    const chips: React.ReactNode[] = []
    const hasPriceFilter = filters.priceMin > 0 || filters.priceMax < 100000
    if (hasPriceFilter) {
      chips.push(
        <TouchableOpacity
          key="price"
          style={styles.chip}
          onPress={removePriceFilter}
        >
          <Text style={styles.chipText}>
            {formatPrice(filters.priceMin)} - {formatPrice(filters.priceMax)}
          </Text>
          <X size={14} color={COLORS.primary} strokeWidth={2} />
        </TouchableOpacity>
      )
    }
    if (filters.bedrooms !== null) {
      chips.push(
        <TouchableOpacity
          key="bedrooms"
          style={styles.chip}
          onPress={removeBedroomFilter}
        >
          <Text style={styles.chipText}>
            {filters.bedrooms === 4 ? '3+' : filters.bedrooms}{' '}
            {t('common.bed', 'bed')}
          </Text>
          <X size={14} color={COLORS.primary} strokeWidth={2} />
        </TouchableOpacity>
      )
    }
    if (filters.moveInDate !== null) {
      chips.push(
        <TouchableOpacity
          key="date"
          style={styles.chip}
          onPress={removeDateFilter}
        >
          <Calendar size={14} color={COLORS.primary} strokeWidth={2} />
          <Text style={styles.chipText}>
            {formatChipDate(filters.moveInDate)}
          </Text>
          <X size={14} color={COLORS.primary} strokeWidth={2} />
        </TouchableOpacity>
      )
    }
    return chips
  }

  const renderCard = ({ item }: { item: PropertyWithRating }) => {
    const photos =
      item.photos && item.photos.length > 0
        ? item.photos
        : [
            `https://picsum.photos/seed/${item.id}-1/800/600`,
            `https://picsum.photos/seed/${item.id}-2/800/600`,
          ]

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.photoContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.indicatorContainer}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[styles.indicator, index === 0 && styles.indicatorActive]}
                />
              ))}
            </View>
          )}
          {role === 'renter' && (
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => toggleSave(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={18}
                color={isPropertySaved(item.id) ? COLORS.primary : COLORS.muted}
                fill={isPropertySaved(item.id) ? COLORS.primary : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(item.monthly_rent_mxn)}
              <Text style={styles.priceLabel}>/{t('common.month', 'mo')}</Text>
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.property_type}</Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingInner}>
              <Star
                size={14}
                color={COLORS.secondary}
                fill={COLORS.secondary}
                strokeWidth={2}
              />
              <Text style={styles.ratingText}>
                {item.avg_rating ? item.avg_rating.toFixed(1) : 'New'}
                {item.review_count ? ` (${item.review_count})` : ''}
              </Text>
            </View>
          </View>

          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
          <Text style={styles.city}>{item.city}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <BedDouble size={18} color={COLORS.muted} strokeWidth={2} />
              <Text style={styles.detailText}>
                {item.bedrooms} {t('common.bed', 'bed')}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <ShowerHead size={18} color={COLORS.muted} strokeWidth={2} />
              <Text style={styles.detailText}>
                {item.bathrooms} {t('common.bath', 'bath')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const activeCount = countActiveFilters(filters)
  const filterChips = renderFilterChips()

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        {/* Search bar + filter button */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <SearchIcon
              size={16}
              color={COLORS.muted}
              strokeWidth={2}
              style={{ marginRight: SPACING.sm }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('common.search', 'Search by address or city...')}
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color={COLORS.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeCount > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <SlidersHorizontal
              size={20}
              color={activeCount > 0 ? COLORS.white : COLORS.muted}
              strokeWidth={2}
            />
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {filterChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {filterChips}
          </ScrollView>
        )}

        {/* Results count */}
        {!loading && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
            </Text>
          </View>
        )}

        {/* Content area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Home
              size={64}
              color={COLORS.muted}
              strokeWidth={2}
              style={{ marginBottom: SPACING.md, opacity: 0.5 }}
            />
            <Text style={styles.emptyTitle}>No properties match your filters</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or search area
            </Text>
            {hasActiveFilters(filters) && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={() => setFilters(DEFAULT_FILTERS)}
              >
                <Text style={styles.clearAllButtonText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={properties}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <SearchFilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: COLORS.white,
    ...(IS_WEB
      ? {
          shadowColor: COLORS.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : {}),
  },
  searchContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    outlineStyle: 'none',
  } as any,
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  chipContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  resultsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: SPACING.sm,
  },
  photoContainer: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.cardBackground,
    position: 'relative' as const,
  },
  heartButton: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  photo: {
    width: CARD_WIDTH,
    height: 280,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
    width: 8,
    height: 8,
  },
  cardContent: {
    padding: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontFamily: FONTS.regular,
  },
  typeBadge: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  ratingRow: {
    marginBottom: SPACING.sm,
  },
  ratingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  address: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  city: {
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
  },
  clearAllButton: {
    marginTop: SPACING.lg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  clearAllButtonText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
})
