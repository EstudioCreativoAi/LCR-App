import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';

export const PropertyDetail = ({ route, navigation }: any) => {
  const property = {
    title: 'Modern Villa with Ocean View',
    price: 45000,
    location: 'El Tezal, Cabo San Lucas',
    beds: 3,
    baths: 2.5,
    sqft: 2200,
    description:
      'Experience the best of Baja living in this stunning long-term rental. Features an open-concept kitchen, private patio with sea views, and 24/7 security. Perfect for remote workers or small families.',
    amenities: ['Wi-Fi', 'Pool', 'Gym', 'Parking', 'Pet Friendly'],
    agent: { name: 'Diego', rating: 4.8 },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView bounces={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
            }}
            style={styles.mainImage}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${property.price.toLocaleString()} MXN
            </Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>6-12 Months</Text>
            </View>
          </View>

          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>📍 {property.location}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Beds</Text>
              <Text style={styles.statValue}>{property.beds}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Baths</Text>
              <Text style={styles.statValue}>{property.baths}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Sqft</Text>
              <Text style={styles.statValue}>{property.sqft}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.agentCard}>
            <View style={styles.agentInfo}>
              <View style={styles.agentAvatar} />
              <View>
                <Text style={styles.agentName}>
                  Managed by {property.agent.name}
                </Text>
                <Text style={styles.agentRating}>
                  ⭐ {property.agent.rating} Rating
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description}</Text>

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenityList}>
            {property.amenities.map((item) => (
              <View key={item} style={styles.amenityTag}>
                <Text style={styles.amenityText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Express Interest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  imageContainer: { width: '100%', height: 300 },
  mainImage: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 20,
  },
  backArrow: { fontSize: 20, color: COLORS.text },
  content: { padding: SPACING.lg },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  price: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.primary },
  tag: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { fontFamily: FONTS.semiBold, color: COLORS.white, fontSize: 12 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: 4,
  },
  location: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statBox: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
  },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  statValue: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  divider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginVertical: SPACING.md,
  },
  agentCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  agentInfo: { flexDirection: 'row', alignItems: 'center' },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.muted,
    marginRight: 12,
  },
  agentName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  agentRating: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  amenityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
  },
  amenityTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  amenityText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  messageButton: {
    flex: 1,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  messageButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontSize: 16,
  },
  applyButton: {
    flex: 2,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    fontSize: 16,
  },
});
