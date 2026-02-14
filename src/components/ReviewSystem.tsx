import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { RatingCategory } from '../types/database'

const IS_WEB = Platform.OS === 'web'

interface ReviewSystemProps {
  propertyId?: string
  renterId?: string
  raterId: string
  category: RatingCategory
  onSubmitSuccess?: () => void
  onCancel?: () => void
}

export default function ReviewSystem({
  propertyId,
  renterId,
  raterId,
  category,
  onSubmitSuccess,
  onCancel,
}: ReviewSystemProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Selection Required', 'Please select a star rating.')
      return
    }

    try {
      setIsSubmitting(true)
      
      const { error } = await (supabase.from('ratings') as any).insert({
        property_id: propertyId,
        renter_id: renterId,
        rater_id: raterId,
        category,
        rating,
        comment: comment.trim() || null,
      })

      if (error) throw error

      if (!IS_WEB) {
        Alert.alert('Thank You', 'Your review has been submitted.')
      } else {
        console.log('Review submitted successfully')
      }

      if (onSubmitSuccess) onSubmitSuccess()
    } catch (error: any) {
      console.error('Error submitting review:', error)
      Alert.alert('Error', 'Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={[styles.starIcon, rating >= star && styles.starIconActive]}>
              {rating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {category === 'property' ? 'Rate this Property' : 'Rate this Renter'}
      </Text>
      <Text style={styles.subtitle}>
        {category === 'property' 
          ? 'How was your experience staying here?' 
          : 'How was the renter during the lease period?'}
      </Text>

      {renderStars()}

      <TextInput
        style={styles.commentInput}
        placeholder="Add a comment (optional)..."
        placeholderTextColor="#8E8E93"
        multiline
        numberOfLines={4}
        value={comment}
        onChangeText={setComment}
      />

      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 40,
    color: '#E5E5EA',
  },
  starIconActive: {
    color: '#FFCC00',
  },
  commentInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    ...(IS_WEB ? { outlineStyle: 'none' } : {}) as any,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
