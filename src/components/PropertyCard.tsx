import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface PropertyCardProps {
  imageUri: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  title: string;
  onPress: () => void;
}

export const PropertyCard = ({
  imageUri,
  price,
  location,
  beds,
  baths,
  title,
  onPress,
}: PropertyCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: imageUri }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.price}>${price.toLocaleString()} MXN/mo</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={styles.location}>{location}</Text>

        <View style={styles.details}>
          <Text style={styles.detailText}>
            {beds} Beds • {baths} Baths
          </Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Verified</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginVertical: SPACING.sm,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.secondary,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'column',
    marginBottom: SPACING.xs,
  },
  price: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: 2,
  },
  location: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: SPACING.sm,
  },
  detailText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
});
