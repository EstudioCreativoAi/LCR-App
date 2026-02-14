import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';
import { PropertyCard } from '../components/PropertyCard';

const CATEGORIES = ['All', 'Houses', 'Apartments', 'Condos', 'Suites'];

export const HomeFeed = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Find your home in</Text>
        <Text style={styles.subGreeting}>Los Cabos</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by area or price..."
            placeholderTextColor={COLORS.muted}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterEmoji}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.pill, activeCategory === cat && styles.activePill]}
            >
              <Text
                style={[
                  styles.pillText,
                  activeCategory === cat && styles.activePillText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={[1, 2, 3]}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={() => (
          <PropertyCard
            title="Modern Villa with Ocean View"
            price={45000}
            location="El Tezal, Cabo San Lucas"
            beds={3}
            baths={2.5}
            imageUri="https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
            onPress={() => navigation.navigate('Details', { propertyId: '123' })}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
  },
  subGreeting: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  filterButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },
  filterEmoji: {
    color: COLORS.white,
  },
  filterScroll: {
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.md,
  },
  pill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  activePill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  activePillText: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
});
