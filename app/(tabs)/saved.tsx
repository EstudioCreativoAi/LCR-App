import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Heart, BedDouble, ShowerHead, MapPin } from 'lucide-react-native'
import { useSession } from '../../src/providers/SessionProvider'
import { useSavedProperties } from '../../src/hooks/useSavedProperties'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import { formatPrice } from '../../src/utils/currency'
import type { SavedPropertyWithDetails } from '../../src/services/savedPropertyService'

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'
const CARD_WIDTH = IS_WEB
  ? Math.min(WINDOW_WIDTH - 32, MAX_CONTENT_WIDTH)
  : WINDOW_WIDTH - 32

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Heart size={64} color={COLORS.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No saved properties yet</Text>
      <Text style={styles.emptySubtitle}>
        Browse listings to save your favorites
      </Text>
    </View>
  )
}

function SavedPropertyCard({
  item,
  onPress,
  onUnsave,
}: {
  item: SavedPropertyWithDetails
  onPress: () => void
  onUnsave: () => void
}) {
  const property = item.property
  const photos =
    property.photos && property.photos.length > 0
      ? property.photos
      : [`https://picsum.photos/seed/${property.id}-1/800/600`]

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
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
                style={[
                  styles.indicator,
                  index === 0 && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.unsaveButton}
          onPress={(e) => {
            e.stopPropagation()
            onUnsave()
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart size={22} color={COLORS.primary} strokeWidth={2} fill={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(property.monthly_rent_mxn)}
            <Text style={styles.priceLabel}>/mo</Text>
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{property.property_type}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <MapPin size={14} color={COLORS.muted} strokeWidth={2} />
          <Text style={styles.address} numberOfLines={1}>
            {property.address}, {property.city}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <BedDouble size={16} color={COLORS.muted} strokeWidth={2} />
            <Text style={styles.detailText}>{property.bedrooms} bed</Text>
          </View>
          <View style={styles.detailItem}>
            <ShowerHead size={16} color={COLORS.muted} strokeWidth={2} />
            <Text style={styles.detailText}>{property.bathrooms} bath</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function SavedScreen() {
  const router = useRouter()
  const { session, role, isDemo } = useSession()
  const userId = session?.user.id ?? null
  const { savedProperties, isLoading, error, refetch, toggleSave } =
    useSavedProperties(isDemo ? null : userId)

  useEffect(() => {
    if (role && role !== 'renter') {
      router.replace('/(tabs)')
    }
  }, [role])

  const handleCardPress = useCallback(
    (propertyId: string) => {
      router.push(`/listing/${propertyId}`)
    },
    [router]
  )

  const handleUnsave = useCallback(
    (propertyId: string) => {
      toggleSave(propertyId)
    },
    [toggleSave]
  )

  const renderItem = useCallback(
    ({ item }: { item: SavedPropertyWithDetails }) => (
      <SavedPropertyCard
        item={item}
        onPress={() => handleCardPress(item.property_id)}
        onUnsave={() => handleUnsave(item.property_id)}
      />
    ),
    [handleCardPress, handleUnsave]
  )

  if (!role || role !== 'renter') return null

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (isDemo) {
    return (
      <View style={styles.centered}>
        <Heart size={64} color={COLORS.muted} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Saved Properties</Text>
        <Text style={styles.emptySubtitle}>
          Sign in to save and view your favorite listings
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Saved Listings</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={savedProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          savedProperties.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...(IS_WEB
      ? { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const, width: '100%' as any }
      : {}),
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  photo: {
    width: CARD_WIDTH,
    height: 200,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
  },
  unsaveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  price: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  typeBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  address: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
})
