import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Image,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { processImageForUpload, uploadImageToStorage } from '../utils/images'
import type { Property, PropertyInsert } from '../types/database'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { formStyles } from '../theme/forms'
import { Camera, X } from 'lucide-react-native'

const { width: WINDOW_WIDTH } = Dimensions.get('window')
const MAX_CONTENT_WIDTH = 800
const IS_WEB = Platform.OS === 'web'

interface CreateListingProps {
  onClose: () => void
  onSuccess: () => void
  initialData?: Property
}

const AMENITIES_OPTIONS = [
  'WiFi', 'A/C', 'Pool', 'Parking', 'Gym', 
  'Pet Friendly', 'Furnished', 'Kitchen', 'Ocean View', 'Washer/Dryer'
]

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Condo', 'Loft', 'Studio']

export default function CreateListing({ onClose, onSuccess, initialData }: CreateListingProps) {
  const isEditMode = Boolean(initialData)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const fadeAnim = useRef(new Animated.Value(1)).current

  // Form State
  const [formData, setFormData] = useState<Partial<PropertyInsert>>({
    address: initialData?.address ?? '',
    city: initialData?.city ?? '',
    property_type: initialData?.property_type ?? 'Apartment',
    bedrooms: initialData?.bedrooms ?? 1,
    bathrooms: initialData?.bathrooms ?? 1,
    monthly_rent_mxn: initialData?.monthly_rent_mxn ?? 0,
    description: initialData?.description ?? '',
    house_rules: initialData?.house_rules ?? '',
    amenities: initialData?.amenities ?? [],
    photos: [],
    status: initialData?.status ?? 'active',
  })

  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos ?? [])
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const inputStyle = (id: string) => [
    formStyles.input,
    focusedInput === id && formStyles.inputFocused,
    Platform.OS === 'web' && { outlineWidth: 0 },
  ]

  const transitionToStep = (newStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(newStep)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    })
  }

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    })

    if (!result.canceled) {
      if (!isEditMode && result.assets.length < 5) {
        Alert.alert('Selection Too Small', 'Please select at least 5 images (max 10).')
        return
      }
      setSelectedImages(result.assets)
    }
  }

  const uploadImages = async (userId: string, propertyId: string): Promise<string[]> => {
    const urls: string[] = []

    for (const asset of selectedImages) {
      const processed = await processImageForUpload(asset.uri)
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const path = `${userId}/${propertyId}/${filename}`

      const result = await uploadImageToStorage(processed, 'property-photos', path)

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      urls.push(result.publicUrl!)
    }

    return urls
  }

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const removeExistingPhoto = (url: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p !== url))
  }

  const handleSubmit = async () => {
    const totalPhotos = existingPhotos.length + selectedImages.length
    if (!isEditMode && selectedImages.length < 5) {
      Alert.alert('Required', 'Please upload 5-10 photos.')
      return
    }
    if (isEditMode && totalPhotos < 1) {
      Alert.alert('Required', 'Please keep at least 1 photo.')
      return
    }

    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const propertyId = isEditMode ? initialData!.id : generateUUID()

      // 1. Upload new images (if any)
      const newImageUrls = selectedImages.length > 0
        ? await uploadImages(user.id, propertyId)
        : []

      const allPhotos = [...existingPhotos, ...newImageUrls]

      if (isEditMode) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update({
            address: formData.address || '',
            city: formData.city || '',
            property_type: formData.property_type || 'Apartment',
            bedrooms: formData.bedrooms || 1,
            bathrooms: formData.bathrooms || 1,
            monthly_rent_mxn: formData.monthly_rent_mxn || 0,
            description: formData.description || null,
            house_rules: formData.house_rules || null,
            amenities: formData.amenities || [],
            photos: allPhotos,
          } as any)
          .eq('id', initialData!.id)

        if (error) throw error

        Alert.alert('Success', 'Property updated successfully!')
      } else {
        // Insert new property
        const finalData: PropertyInsert = {
          ...formData,
          id: propertyId,
          landlord_id: user.id,
          photos: allPhotos,
          address: formData.address || '',
          city: formData.city || '',
          property_type: formData.property_type || 'Apartment',
          bedrooms: formData.bedrooms || 1,
          bathrooms: formData.bathrooms || 1,
          monthly_rent_mxn: formData.monthly_rent_mxn || 0,
        } as PropertyInsert

        const { error } = await supabase
          .from('properties')
          .insert(finalData as any)

        if (error) throw error

        Alert.alert('Success', 'Property listed successfully!')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Submit error:', error)
      Alert.alert('Error', error.message || (isEditMode ? 'Failed to update listing' : 'Failed to create listing'))
    } finally {
      setLoading(false)
    }
  }

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities || []
    if (current.includes(amenity)) {
      setFormData({ ...formData, amenities: current.filter(a => a !== amenity) })
    } else {
      setFormData({ ...formData, amenities: [...current, amenity] })
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Basic Information</Text>

      <Text style={formStyles.label}>Full Address</Text>
      <TextInput
        style={inputStyle('address')}
        placeholder="e.g. 123 Marina Blvd, Suite 4"
        placeholderTextColor={COLORS.muted}
        value={formData.address}
        onChangeText={(v) => setFormData({ ...formData, address: v })}
        onFocus={() => setFocusedInput('address')}
        onBlur={() => setFocusedInput(null)}
      />

      <Text style={formStyles.label}>City</Text>
      <TextInput
        style={inputStyle('city')}
        placeholder="e.g. Cabo San Lucas"
        placeholderTextColor={COLORS.muted}
        value={formData.city}
        onChangeText={(v) => setFormData({ ...formData, city: v })}
        onFocus={() => setFocusedInput('city')}
        onBlur={() => setFocusedInput(null)}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={formStyles.label}>Property Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
            {PROPERTY_TYPES.map(t => (
              <TouchableOpacity 
                key={t}
                style={[styles.typeOption, formData.property_type === t && styles.typeOptionActive]}
                onPress={() => setFormData({ ...formData, property_type: t })}
              >
                <Text style={[styles.typeOptionText, formData.property_type === t && styles.typeOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={formStyles.label}>Bedrooms</Text>
          <TextInput
            style={inputStyle('bedrooms')}
            keyboardType="numeric"
            placeholderTextColor={COLORS.muted}
            value={formData.bedrooms?.toString()}
            onChangeText={(v) => setFormData({ ...formData, bedrooms: parseInt(v) || 0 })}
            onFocus={() => setFocusedInput('bedrooms')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={formStyles.label}>Bathrooms</Text>
          <TextInput
            style={inputStyle('bathrooms')}
            keyboardType="numeric"
            placeholderTextColor={COLORS.muted}
            value={formData.bathrooms?.toString()}
            onChangeText={(v) => setFormData({ ...formData, bathrooms: parseFloat(v) || 0 })}
            onFocus={() => setFocusedInput('bathrooms')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>
      </View>

      <Text style={formStyles.label}>Monthly Rent (MXN)</Text>
      <TextInput
        style={[inputStyle('rent'), styles.priceInput]}
        keyboardType="numeric"
        placeholder="$0.00"
        placeholderTextColor={COLORS.muted}
        value={formData.monthly_rent_mxn?.toString()}
        onChangeText={(v) => setFormData({ ...formData, monthly_rent_mxn: parseFloat(v) || 0 })}
        onFocus={() => setFocusedInput('rent')}
        onBlur={() => setFocusedInput(null)}
      />

      <TouchableOpacity
        style={formStyles.submitButton}
        onPress={() => transitionToStep(2)}
      >
        <Text style={styles.primaryButtonText}>Next: Description & Amenities</Text>
      </TouchableOpacity>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Details & Amenities</Text>

      <Text style={formStyles.label}>Property Description</Text>
      <TextInput
        style={[inputStyle('description'), styles.textArea]}
        multiline
        numberOfLines={4}
        placeholder="Tell potential renters what makes your property special..."
        placeholderTextColor={COLORS.muted}
        value={formData.description || ''}
        onChangeText={(v) => setFormData({ ...formData, description: v })}
        onFocus={() => setFocusedInput('description')}
        onBlur={() => setFocusedInput(null)}
      />

      <Text style={formStyles.label}>House Rules</Text>
      <TextInput
        style={[inputStyle('house_rules'), styles.textArea]}
        multiline
        numberOfLines={3}
        placeholder="e.g. No smoking, Quiet hours after 10 PM..."
        placeholderTextColor={COLORS.muted}
        value={formData.house_rules || ''}
        onChangeText={(v) => setFormData({ ...formData, house_rules: v })}
        onFocus={() => setFocusedInput('house_rules')}
        onBlur={() => setFocusedInput(null)}
      />

      <Text style={formStyles.label}>Amenities</Text>
      <View style={styles.amenitiesGrid}>
        {AMENITIES_OPTIONS.map(a => (
          <TouchableOpacity 
            key={a}
            style={[styles.amenityItem, formData.amenities?.includes(a) && styles.amenityItemActive]}
            onPress={() => toggleAmenity(a)}
          >
            <Text style={[styles.amenityText, formData.amenities?.includes(a) && styles.amenityTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => transitionToStep(1)}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[formStyles.submitButton, { flex: 1, marginLeft: 12 }]}
          onPress={() => transitionToStep(3)}
        >
          <Text style={styles.primaryButtonText}>Next: Photo Upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderStep3 = () => {
    const totalPhotos = existingPhotos.length + selectedImages.length
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>Property Photos</Text>
        <Text style={formStyles.instructionalText}>
          {isEditMode
            ? `${totalPhotos} photo${totalPhotos !== 1 ? 's' : ''} total. Add more or remove existing ones.`
            : 'Upload 5-10 high-quality photos to attract renters.'}
        </Text>

        {existingPhotos.length > 0 && (
          <>
            <Text style={[formStyles.label, { marginTop: SPACING.sm }]}>Current Photos</Text>
            <ScrollView horizontal style={styles.previewScroll} showsHorizontalScrollIndicator={false}>
              {existingPhotos.map((url, i) => (
                <View key={`existing-${i}`} style={styles.previewImageWrapper}>
                  <Image source={{ uri: url }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removeExistingPhoto(url)}
                  >
                    <X size={14} color={COLORS.white} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity style={styles.uploadBox} onPress={pickImages}>
          <Camera size={32} color={COLORS.muted} strokeWidth={2} style={{ marginBottom: SPACING.sm }} />
          <Text style={styles.uploadText}>
            {selectedImages.length > 0
              ? `${selectedImages.length} New Photo${selectedImages.length !== 1 ? 's' : ''} Selected`
              : isEditMode ? 'Add More Photos' : 'Select Photos'}
          </Text>
        </TouchableOpacity>

        {selectedImages.length > 0 && (
          <ScrollView horizontal style={styles.previewScroll} showsHorizontalScrollIndicator={false}>
            {selectedImages.map((img, i) => (
              <Image key={`new-${i}`} source={{ uri: img.uri }} style={styles.previewImage} />
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{isEditMode ? 'Saving changes...' : 'Uploading listing...'}</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => transitionToStep(2)}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[formStyles.submitButton, { flex: 1, marginLeft: 12 }]}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryButtonText}>{isEditMode ? 'Save Changes' : 'Publish Listing'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.overlay, IS_WEB && styles.overlayWeb]}>
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEditMode ? 'Edit Listing' : 'Create New Listing'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={16} color={COLORS.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayWeb: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: SPACING.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    height: Platform.OS === 'web' ? '90%' : '100%',
    overflow: 'hidden',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  title: {
    fontSize: 22,
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
  closeText: {
    fontSize: 16,
    color: COLORS.muted,
    fontFamily: FONTS.bold,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.cardBackground,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  stepContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  priceInput: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  typeSelector: {
    marginTop: 4,
    flexDirection: 'row',
  },
  typeOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  typeOptionTextActive: {
    color: COLORS.white,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: SPACING.sm,
  },
  amenityItem: {
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  amenityItemActive: {
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.primary,
  },
  amenityText: {
    fontSize: 14,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
  },
  amenityTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  uploadBox: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.md,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  uploadText: {
    fontSize: 15,
    color: COLORS.muted,
    fontFamily: FONTS.semiBold,
  },
  previewScroll: {
    marginTop: SPACING.md,
    height: 100,
  },
  previewImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 0,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  secondaryButtonText: {
    color: COLORS.muted,
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
  loadingOverlay: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.muted,
    fontFamily: FONTS.semiBold,
  },
})
