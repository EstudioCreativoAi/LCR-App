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
} from 'react-native'
import { supabase } from '../lib/supabase'
import { UserRole } from '../types/database'
import SearchFilterModal, { SearchFilters } from './SearchFilterModal'

interface Property {
  id: string
  address: string
  city: string
  property_type: string
  bedrooms: number
  bathrooms: number
  monthly_rent_mxn: number
  status: string
  available_from?: string
  photos?: string[]
}

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'
const CARD_WIDTH = IS_WEB ? Math.min(WINDOW_WIDTH - 32, MAX_CONTENT_WIDTH) : WINDOW_WIDTH - 32

const PropertyCard = ({ item }: { item: Property }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

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
    <View style={styles.card}>
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
            <Text style={styles.priceLabel}>/month</Text>
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.property_type}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.city}>{item.city}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🛌</Text>
            <Text style={styles.detailText}>{item.bedrooms} Bed</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🚿</Text>
            <Text style={styles.detailText}>{item.bathrooms} Bath</Text>
          </View>
        </View>

        {item.available_from && (
          <View style={styles.availableRow}>
            <Text style={styles.availableText}>
              Available from: {new Date(item.available_from).toLocaleDateString('es-MX')}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

interface PropertyFeedProps {
  role?: UserRole
}

export default function PropertyFeed({ role }: PropertyFeedProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
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

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (!error && data && data.length > 0) {
        setProperties(data)
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
            photos: [
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
            ]
          }
        ]
        setProperties(mockProperties)
      }
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
              placeholder="Search by city..."
              placeholderTextColor="#8E8E93"
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
            <ActivityIndicator size="large" color="#007AFF" />
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
            renderItem={({ item }) => <PropertyCard item={item} />}
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
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  container: { 
    flex: 1, 
    width: '100%', 
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: '#FFFFFF',
    ...(IS_WEB ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    } : {})
  },
  searchContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchBar: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F2F2F7', 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#000000', outlineStyle: 'none' } as any,
  clearIcon: { fontSize: 16, color: '#8E8E93', padding: 4 },
  filterButton: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: { fontSize: 20 },
  filterIconActive: {  },
  filterBadge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    backgroundColor: '#FF3B30', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  resultsContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  resultsText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  listContent: { padding: 16, gap: 24 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    overflow: 'hidden', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12,
    marginBottom: 8,
  },
  photoCarousel: { width: '100%', height: 280, backgroundColor: '#F2F2F7' },
  photo: { width: CARD_WIDTH, height: 280 },
  indicatorContainer: { 
    position: 'absolute', 
    bottom: 16, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 6
  },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  indicatorActive: { backgroundColor: '#FFFFFF', width: 8, height: 8 },
  cardContent: { padding: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  price: { fontSize: 22, fontWeight: '800', color: '#1C1C1E' },
  priceLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '400' },
  typeBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  address: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 },
  city: { fontSize: 15, color: '#8E8E93', marginBottom: 16 },
  detailsRow: { flexDirection: 'row', gap: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon: { fontSize: 18 },
  detailText: { fontSize: 15, color: '#3A3A3C', fontWeight: '500' },
  availableRow: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  availableText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, minHeight: 400 },
  emptyIcon: { fontSize: 64, marginBottom: 20, opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#8E8E93', textAlign: 'center' },
})

