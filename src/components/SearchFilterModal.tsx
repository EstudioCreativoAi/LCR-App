import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native'
import Slider from '@react-native-community/slider'
import DateTimePicker from '@react-native-community/datetimepicker'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { formatPrice } from '../utils/currency'
import { X, Calendar } from 'lucide-react-native'

export interface SearchFilters {
  priceMin: number
  priceMax: number
  bedrooms: number | null
  moveInDate: Date | null
}

interface SearchFilterModalProps {
  visible: boolean
  onClose: () => void
  onApply: (filters: SearchFilters) => void
  initialFilters?: SearchFilters
}

const DEFAULT_FILTERS: SearchFilters = {
  priceMin: 0,
  priceMax: 100000,
  bedrooms: null,
  moveInDate: null,
}

export default function SearchFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters = DEFAULT_FILTERS,
}: SearchFilterModalProps) {
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin)
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax)
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(
    initialFilters.bedrooms
  )
  const [moveInDate, setMoveInDate] = useState<Date | null>(
    initialFilters.moveInDate
  )
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleReset = () => {
    setPriceMin(DEFAULT_FILTERS.priceMin)
    setPriceMax(DEFAULT_FILTERS.priceMax)
    setSelectedBedrooms(DEFAULT_FILTERS.bedrooms)
    setMoveInDate(DEFAULT_FILTERS.moveInDate)
  }

  const handleApply = () => {
    onApply({
      priceMin,
      priceMax,
      bedrooms: selectedBedrooms,
      moveInDate,
    })
    onClose()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date'
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const bedroomOptions = [1, 2, 3]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter Properties</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={COLORS.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Price Range Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range (MXN)</Text>
            <View style={styles.priceDisplay}>
              <Text style={styles.priceText}>{formatPrice(priceMin)}</Text>
              <Text style={styles.priceSeparator}>—</Text>
              <Text style={styles.priceText}>{formatPrice(priceMax)}</Text>
            </View>

            {/* Min Price Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Minimum</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100000}
                step={1000}
                value={priceMin}
                onValueChange={setPriceMin}
                minimumTrackTintColor={COLORS.secondary}
                maximumTrackTintColor={COLORS.secondary}
                thumbTintColor={COLORS.primary}
              />
              <Text style={styles.sliderValue}>{formatPrice(priceMin)}</Text>
            </View>

            {/* Max Price Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Maximum</Text>
              <Slider
                style={styles.slider}
                minimumValue={priceMin}
                maximumValue={200000}
                step={1000}
                value={priceMax}
                onValueChange={setPriceMax}
                minimumTrackTintColor={COLORS.secondary}
                maximumTrackTintColor={COLORS.secondary}
                thumbTintColor={COLORS.primary}
              />
              <Text style={styles.sliderValue}>{formatPrice(priceMax)}</Text>
            </View>
          </View>

          {/* Bedrooms Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bedrooms</Text>
            <View style={styles.bedroomButtons}>
              {bedroomOptions.map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.bedroomButton,
                    selectedBedrooms === num && styles.bedroomButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedBedrooms(selectedBedrooms === num ? null : num)
                  }
                >
                  <Text
                    style={[
                      styles.bedroomButtonText,
                      selectedBedrooms === num &&
                        styles.bedroomButtonTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.bedroomButton,
                  selectedBedrooms === 4 && styles.bedroomButtonActive,
                ]}
                onPress={() =>
                  setSelectedBedrooms(selectedBedrooms === 4 ? null : 4)
                }
              >
                <Text
                  style={[
                    styles.bedroomButtonText,
                    selectedBedrooms === 4 && styles.bedroomButtonTextActive,
                  ]}
                >
                  3+
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Move-in Date Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Move-in Date</Text>
              {moveInDate && (
                <TouchableOpacity onPress={() => setMoveInDate(null)}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                {formatDate(moveInDate)}
              </Text>
              <Calendar size={18} color={COLORS.text} strokeWidth={2} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={moveInDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios')
                  if (selectedDate) {
                    setMoveInDate(selectedDate)
                  }
                }}
              />
            )}
            
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.muted,
    fontFamily: FONTS.semiBold,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  priceSeparator: {
    fontSize: 20,
    color: COLORS.muted,
    marginHorizontal: 12,
  },
  sliderContainer: {
    marginBottom: SPACING.md,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    textAlign: 'right',
    marginTop: -4,
  },
  bedroomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bedroomButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bedroomButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bedroomButtonText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  bedroomButtonTextActive: {
    color: COLORS.white,
  },
  datePickerButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  calendarIcon: {
    fontSize: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.accent,
    fontFamily: FONTS.semiBold,
  },
  doneButton: {
    alignSelf: 'flex-end',
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  doneButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.sm,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  applyButton: {
    flex: 2,
    height: 56,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
})
