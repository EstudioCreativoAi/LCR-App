import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  FlatList,
  Platform,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { UserRole, Property as DBProperty } from '../types/database'
import SearchFilterModal, { SearchFilters } from './SearchFilterModal'
import PropertyDetail from './PropertyDetail'
import ReviewSystem from './ReviewSystem'
import { Session } from '@supabase/supabase-js'

interface Property extends DBProperty {
  avg_rating?: number
  review_count?: number
}

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'
const CARD_WIDTH = IS_WEB ? Math.min(WINDOW_WIDTH - 32, MAX_CONTENT_WIDTH) : WINDOW_WIDTH - 32

const PropertyCard = ({ 
  item, 
  role, 
  isDemo, 
  onOpenDetail 
}: { 
  item: Property; 
  role?: UserRole; 
  isDemo?: boolean;
  onOpenDetail: (p: Property) => void
}) => {
  const { t } = useTranslation()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [sendingLead, setSendingLead] = useState(false)

  const handleInterest = async () => {
    try {
      setSendingLead(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Sign In', 'Please sign in to express interest.')
        return
      }

      if (isDemo) {
        Alert.alert('Success (Demo)', 'Landlord has been notified! They will contact you soon.')
        return
      }

      const { error } = await supabase
        .from('leads')
        .insert({
          property_id: item.id,
          renter_id: user.id,
          status: 'Interested',
          message: 'I am interested in this property!',
        } as any)

      if (error) throw error
      Alert.alert('Success', 'Landlord has been notified! They will contact you soon.')
    } catch (error: any) {
      console.error('Error sending lead:', error)
      Alert.alert('Error', 'Failed to send interest. Please try again.')
    } finally {
      setSendingLead(false)
    }
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / CARD_WIDTH)
    setCurrentPhotoIndex(index)
  }

  const photos = item.photos && item.photos.length > 0 
    ? item.photos 
    : [
        `https://picsum.photos/seed/${item.id}-1/800/600`,
        `https://picsum.photos/seed/${item.id}-2/800/600`,
        `https://picsum.photos/seed/${item.id}-3/800/600`,
      ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(item)}>
      <View style={styles.photoCarousel}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
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
                style={[
                  styles.indicator,
                  currentPhotoIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(item.monthly_rent_mxn)}
            <Text style={styles.priceLabel}>/{t('common.month')}</Text>
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.property_type}</Text>
          </View>
        </View>

        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>
            {item.avg_rating ? `★ ${item.avg_rating.toFixed(1)}` : '★ New'} 
            {item.review_count ? ` (${item.review_count})` : ''}
          </Text>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.city}>{item.city}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🛌</Text>
            <Text style={styles.detailText}>{item.bedrooms} {t('common.bed')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🚿</Text>
            <Text style={styles.detailText}>{item.bathrooms} {t('common.bath')}</Text>
          </View>
        </View>

        {role === 'renter' && (
          <TouchableOpacity 
            style={[styles.interestButton, sendingLead && styles.interestButtonDisabled]}
            onPress={handleInterest}
            disabled={sendingLead}
          >
            {sendingLead ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.interestButtonText}>{t('common.interested')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

interface PropertyFeedProps {
  role?: UserRole
  isDemo?: boolean
}

export default function PropertyFeed({ role, isDemo }: PropertyFeedProps) {
  const { t } = useTranslation()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showRatingModal, setShowRatingModal] = useState<{ propertyId: string, renterId: string } | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: 100000,
    bedrooms: null,
    moveInDate: null,
  })

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('properties').select('*').eq('status', 'active')

      if (searchQuery.trim()) {
        query = query.ilike('city', `%${searchQuery.trim()}%`)
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

      const { data, error } = isDemo ? { data: null, error: null } : await query.order('created_at', { ascending: false })
      
      let finalProperties: Property[] = []

      if (!error && data && data.length > 0) {
        // Fetch ratings for these properties
        const propertyIds = data.map((p: any) => p.id)
        const { data: ratingsData } = await (supabase
          .from('ratings') as any)
          .select('property_id, rating')
          .in('property_id', propertyIds)
          .eq('category', 'property')

        finalProperties = data.map((p: any) => {
          const pRatings = ratingsData?.filter((r: any) => r.property_id === p.id) || []
          const avg = pRatings.length > 0 
            ? pRatings.reduce((acc: number, r: any) => acc + r.rating, 0) / pRatings.length 
            : undefined
          return {
            ...p,
            avg_rating: avg,
            review_count: pRatings.length
          }
        })
      } else {
        // Fallback mock data for a WOW factor if DB is empty
        const mockProperties: Property[] = [
          {
            id: 'mock-1',
            address: 'Villa del Mar #45',
            city: 'Cabo San Lucas',
            property_type: 'Villa',
            bedrooms: 4,
            bathrooms: 4.5,
            monthly_rent_mxn: 85000,
            status: 'active',
            available_from: new Date().toISOString(),
            landlord_id: 'mock-landlord',
            agent_id: null,
            latitude: 0,
            longitude: 0,
            description: 'Luxury villa',
            house_rules: '',
            amenities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            photos: [
              'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
            ]
          },
          {
            id: 'mock-2',
            address: 'Condo Pacifico Penthouse',
            city: 'San Jose del Cabo',
            property_type: 'Condo',
            bedrooms: 2,
            bathrooms: 2,
            monthly_rent_mxn: 35000,
            status: 'active',
            available_from: new Date().toISOString(),
            landlord_id: 'mock-landlord',
            agent_id: null,
            latitude: 0,
            longitude: 0,
            description: 'Beautiful condo',
            house_rules: '',
            amenities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            photos: [
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
            ]
          },
          {
            id: 'mock-3',
            address: 'Baja Sands Loft',
            city: 'Cabo San Lucas',
            property_type: 'Apartment',
            bedrooms: 1,
            bathrooms: 1,
            monthly_rent_mxn: 18500,
            status: 'active',
            available_from: new Date().toISOString(),
            landlord_id: 'mock-landlord',
            agent_id: null,
            latitude: 0,
            longitude: 0,
            description: 'Cozy loft',
            house_rules: '',
            amenities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            photos: [
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
            ]
          }
        ]
        finalProperties = mockProperties
      }
      setProperties(finalProperties)
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filters])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const activeFilterCount = () => {
    let count = 0
    if (filters.bedrooms !== null) count++
    if (filters.priceMin > 0 || filters.priceMax < 100000) count++
    if (filters.moveInDate !== null) count++
    return count
  }

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('common.search')}
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.filterButton, activeFilterCount() > 0 && styles.filterButtonActive]} 
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={[styles.filterIcon, activeFilterCount() > 0 && styles.filterIconActive]}>⚙️</Text>
            {activeFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!loading && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>{properties.length} properties found</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No properties found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters or search area</Text>
          </View>
        ) : (
          <FlatList
            data={properties}
            renderItem={({ item }) => (
              <PropertyCard 
                item={item} 
                role={role} 
                isDemo={isDemo} 
                onOpenDetail={(p) => setSelectedProperty(p)} 
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <SearchFilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={(newFilters) => setFilters(newFilters)}
          initialFilters={filters}
        />

        {selectedProperty && (
          <PropertyDetail 
            property={selectedProperty} 
            onClose={() => setSelectedProperty(null)} 
          />
        )}
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
    ...(IS_WEB ? {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    } : {}),
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
  searchIcon: { fontSize: 16, marginRight: SPACING.sm },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text, outlineStyle: 'none' } as any,
  clearIcon: { fontSize: 16, color: COLORS.muted, padding: 4 },
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
  filterIcon: { fontSize: 20 },
  filterIconActive: {},
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
  filterBadgeText: { color: COLORS.white, fontSize: 11, fontFamily: FONTS.bold },
  resultsContainer: { paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: COLORS.cardBackground },
  resultsText: { fontSize: 13, color: COLORS.muted, fontFamily: FONTS.medium },
  listContent: { padding: SPACING.md, gap: SPACING.lg },
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
  photoCarousel: { width: '100%', height: 280, backgroundColor: COLORS.cardBackground },
  photo: { width: CARD_WIDTH, height: 280 },
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
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  indicatorActive: { backgroundColor: COLORS.white, width: 8, height: 8 },
  cardContent: { padding: SPACING.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  price: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  priceLabel: { fontSize: 14, color: COLORS.muted, fontFamily: FONTS.regular },
  typeBadge: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted, textTransform: 'uppercase' },
  address: { fontSize: 17, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: 4 },
  city: { fontSize: 15, color: COLORS.muted, marginBottom: SPACING.md },
  detailsRow: { flexDirection: 'row', gap: SPACING.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon: { fontSize: 18 },
  detailText: { fontSize: 15, color: COLORS.text, fontFamily: FONTS.medium },
  availableRow: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.cardBackground },
  availableText: { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.semiBold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, minHeight: 400 },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.md, opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.muted, textAlign: 'center' },
  interestButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  interestButtonDisabled: {
    opacity: 0.7,
  },
  interestButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  ratingRow: {
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
})

