import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Building, Pencil, Pause, Play, Trash2, Plus } from 'lucide-react-native'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import { formatPrice } from '../../src/utils/currency'
import type { Property, PropertyStatus } from '../../src/types/database'

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'

const STATUS_CONFIG: Record<PropertyStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#E8F5E9', text: '#2E7D32' },
  rented: { label: 'Rented', bg: '#E3F2FD', text: '#1565C0' },
  paused: { label: 'Paused', bg: '#FFF3E0', text: '#E65100' },
}

function StatusBadge({ status }: { status: PropertyStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  return (
    <View style={[statusStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[statusStyles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const statusStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
  },
})

function ListingCard({
  item,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  item: Property
  onEdit: (p: Property) => void
  onToggleStatus: (p: Property) => void
  onDelete: (p: Property) => void
}) {
  const photo =
    item.photos && item.photos.length > 0
      ? item.photos[0]
      : `https://picsum.photos/seed/${item.id}/800/600`

  return (
    <View style={styles.card}>
      <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardPrice}>
              {formatPrice(item.monthly_rent_mxn)}
              <Text style={styles.cardPriceLabel}>/mo</Text>
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.cardAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.cardCity}>{item.city}</Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionEdit]}
            onPress={() => onEdit(item)}
          >
            <Pencil size={18} color={COLORS.white} strokeWidth={2} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionToggle]}
            onPress={() => onToggleStatus(item)}
          >
            {item.status === 'paused' ? (
              <>
                <Play size={18} color={COLORS.white} strokeWidth={2} />
                <Text style={styles.actionText}>Activate</Text>
              </>
            ) : (
              <>
                <Pause size={18} color={COLORS.white} strokeWidth={2} />
                <Text style={styles.actionText}>Pause</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionDelete]}
            onPress={() => onDelete(item)}
          >
            <Trash2 size={18} color={COLORS.white} strokeWidth={2} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function MyListingsScreen() {
  const router = useRouter()
  const { session, role, isDemo } = useSession()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (role && role !== 'landlord' && role !== 'agent') {
      router.replace('/(tabs)')
    }
  }, [role])

  const fetchMyListings = useCallback(
    async (silent = false) => {
      if (!userId) {
        setProperties([])
        setIsLoading(false)
        return
      }

      if (!silent) setIsLoading(true)
      setError(null)

      try {
        if (isDemo) {
          setProperties([])
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }

        const { data, error: queryError } = await supabase
          .from('properties')
          .select('*')
          .or(`landlord_id.eq.${userId},agent_id.eq.${userId}`)
          .order('created_at', { ascending: false })

        if (queryError) {
          setError(queryError.message)
        } else {
          setProperties((data as Property[]) ?? [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch listings')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [userId, isDemo]
  )

  useFocusEffect(
    useCallback(() => {
      fetchMyListings()
    }, [fetchMyListings])
  )

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    fetchMyListings(true)
  }, [fetchMyListings])

  const handleEdit = useCallback(
    (property: Property) => {
      router.push(`/edit-listing/${property.id}`)
    },
    [router]
  )

  const handleToggleStatus = useCallback(
    async (property: Property) => {
      const newStatus: PropertyStatus = property.status === 'paused' ? 'active' : 'paused'
      const label = newStatus === 'active' ? 'activate' : 'pause'

      const doToggle = async () => {
        try {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ status: newStatus })
            .eq('id', property.id)

          if (updateError) {
            Alert.alert('Error', updateError.message)
            return
          }

          setProperties((prev) =>
            prev.map((p) => (p.id === property.id ? { ...p, status: newStatus } : p))
          )
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Update failed')
        }
      }

      if (IS_WEB) {
        if (window.confirm(`Are you sure you want to ${label} this listing?`)) {
          await doToggle()
        }
      } else {
        Alert.alert(
          `${label.charAt(0).toUpperCase() + label.slice(1)} Listing`,
          `Are you sure you want to ${label} this listing?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes', onPress: doToggle },
          ]
        )
      }
    },
    []
  )

  const handleDelete = useCallback(
    async (property: Property) => {
      const doDelete = async () => {
        try {
          const { error: deleteError } = await supabase
            .from('properties')
            .delete()
            .eq('id', property.id)

          if (deleteError) {
            Alert.alert('Error', deleteError.message)
            return
          }

          setProperties((prev) => prev.filter((p) => p.id !== property.id))
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed')
        }
      }

      if (IS_WEB) {
        if (window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
          await doDelete()
        }
      } else {
        Alert.alert(
          'Delete Listing',
          'Are you sure you want to delete this listing? This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: doDelete },
          ]
        )
      }
    },
    []
  )

  const renderItem = useCallback(
    ({ item }: { item: Property }) => (
      <ListingCard
        item={item}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    ),
    [handleEdit, handleToggleStatus, handleDelete]
  )

  if (!role || (role !== 'landlord' && role !== 'agent')) return null

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Listings</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/create-listing')}
          >
            <Plus size={22} color={COLORS.white} strokeWidth={2} />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchMyListings()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.centered}>
            <Building
              size={64}
              color={COLORS.muted}
              strokeWidth={1.5}
              style={{ marginBottom: SPACING.md, opacity: 0.5 } as any}
            />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first listing and start receiving leads.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/create-listing')}
            >
              <Plus size={20} color={COLORS.white} strokeWidth={2} />
              <Text style={styles.createButtonText}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={properties}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
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
    ...(IS_WEB
      ? {
          shadowColor: COLORS.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 400,
  },
  errorText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
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
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.cardBackground,
  },
  cardBody: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardPrice: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  cardPriceLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontFamily: FONTS.regular,
  },
  cardAddress: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  cardCity: {
    fontSize: 15,
    color: COLORS.muted,
    fontFamily: FONTS.regular,
    marginBottom: SPACING.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBackground,
    paddingTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionEdit: {
    backgroundColor: COLORS.secondary,
  },
  actionToggle: {
    backgroundColor: COLORS.muted,
  },
  actionDelete: {
    backgroundColor: COLORS.accent,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
})
