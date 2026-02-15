import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Property, Rating } from '../types/database'
import { useTranslation } from 'react-i18next'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { formatPrice } from '../utils/currency'
import { X, Star, BedDouble, ShowerHead, Home } from 'lucide-react-native'

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const IS_WEB = Platform.OS === 'web'
const MAX_CONTENT_WIDTH = 800

interface PropertyDetailProps {
  property: Property
  onClose: () => void
}

export default function PropertyDetail({ property, onClose }: PropertyDetailProps) {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    fetchReviews()
  }, [property.id])

  const fetchReviews = async () => {
    try {
      const { data, error } = await (supabase
        .from('ratings') as any)
        .select(`
          *,
          profiles:rater_id(full_name, avatar_url)
        `)
        .eq('property_id', property.id)
        .eq('category', 'property')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setReviews(data)
        const sum = data.reduce((acc: number, curr: any) => acc + curr.rating, 0)
        setAvgRating(sum / data.length)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Image
            source={{ uri: item.profiles?.avatar_url || `https://i.pravatar.cc/100?u=${item.rater_id}` }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.reviewerName}>{item.profiles?.full_name || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={[styles.ratingBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          <Star size={13} color={COLORS.secondary} fill={COLORS.secondary} strokeWidth={2} />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
    </View>
  )

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 4 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={14} color={COLORS.muted} strokeWidth={2} />
            <Text style={styles.backButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{property.address}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Image
            source={{ uri: property.photos?.[0] || `https://picsum.photos/seed/${property.id}/800/600` }}
            style={styles.heroImage}
          />

          <View style={styles.content}>
            <View style={styles.mainInfo}>
              <View>
                <Text style={styles.price}>{formatPrice(property.monthly_rent_mxn)}<Text style={styles.priceLabel}>/mo</Text></Text>
                <Text style={styles.address}>{property.address}, {property.city}</Text>
              </View>
              {avgRating > 0 && (
                <View style={styles.avgRatingBadge}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Star size={20} color={COLORS.secondary} fill={COLORS.secondary} strokeWidth={2} />
                    <Text style={styles.avgRatingText}>{avgRating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <BedDouble size={24} color={COLORS.text} strokeWidth={2} />
                <Text style={styles.statText}>{property.bedrooms} Bed</Text>
              </View>
              <View style={styles.statItem}>
                <ShowerHead size={24} color={COLORS.text} strokeWidth={2} />
                <Text style={styles.statText}>{property.bathrooms} Bath</Text>
              </View>
              <View style={styles.statItem}>
                <Home size={24} color={COLORS.text} strokeWidth={2} />
                <Text style={styles.statText}>{property.property_type}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>About this property</Text>
            <Text style={styles.description}>
              {property.description || 'Stunning rental opportunity in a prime location. Features modern amenities and spacious living areas perfect for comfort and style.'}
            </Text>

            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Guest Reviews</Text>
              {loadingReviews ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : reviews.length === 0 ? (
                <Text style={styles.emptyReviews}>No reviews yet. Be the first to stay!</Text>
              ) : (
                reviews.map(review => (
                  <View key={review.id}>
                    {renderReview({ item: review })}
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: IS_WEB ? 40 : 60,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroImage: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: SPACING.lg,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  price: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  priceLabel: {
    fontSize: 16,
    color: COLORS.muted,
    fontFamily: FONTS.regular,
  },
  address: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 4,
  },
  avgRatingBadge: {
    alignItems: 'flex-end',
  },
  avgRatingText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.md,
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 24,
  },
  statText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 30,
  },
  reviewsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBackground,
    paddingTop: 30,
  },
  reviewCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  ratingBadge: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  reviewComment: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  emptyReviews: {
    fontSize: 15,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.md,
  },
})
