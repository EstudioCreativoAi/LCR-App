import { useState, useEffect, useCallback } from 'react'
import * as ratingService from '../services/ratingService'
import type {
  RatingWithReviewer,
  RatingStats,
  SubmitRatingParams,
  RatingCategory,
} from '../services/ratingService'

export interface UsePropertyRatingsReturn {
  ratings: RatingWithReviewer[]
  stats: RatingStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePropertyRatings(propertyId: string | null): UsePropertyRatingsReturn {
  const [ratings, setRatings] = useState<RatingWithReviewer[]>([])
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRatings = useCallback(async () => {
    if (!propertyId) {
      setRatings([])
      setStats(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await ratingService.fetchPropertyRatings(propertyId)

    if (result.success && result.data) {
      setRatings(result.data)

      if (result.data.length > 0) {
        const sum = result.data.reduce((acc, r) => acc + r.score, 0)
        setStats({
          avgRating: sum / result.data.length,
          totalReviews: result.data.length,
        })
      } else {
        setStats(null)
      }
    } else {
      setError(result.error ?? 'Failed to fetch ratings')
    }

    setIsLoading(false)
  }, [propertyId])

  useEffect(() => {
    fetchRatings()
  }, [fetchRatings])

  const refetch = useCallback(async () => {
    await fetchRatings()
  }, [fetchRatings])

  return {
    ratings,
    stats,
    isLoading,
    error,
    refetch,
  }
}

export interface UseSubmitRatingReturn {
  isSubmitting: boolean
  error: string | null
  submitRating: (params: SubmitRatingParams) => Promise<boolean>
  checkExisting: (leaseId: string, reviewerId: string, category: RatingCategory) => Promise<boolean>
}

export function useSubmitRating(): UseSubmitRatingReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitRating = useCallback(async (params: SubmitRatingParams): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)

    const result = await ratingService.submitRating(params)

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error ?? 'Failed to submit rating')
      return false
    }

    return true
  }, [])

  const checkExisting = useCallback(async (
    leaseId: string,
    reviewerId: string,
    category: RatingCategory
  ): Promise<boolean> => {
    const result = await ratingService.checkExistingRating(leaseId, reviewerId, category)
    return result.success && result.data !== null
  }, [])

  return {
    isSubmitting,
    error,
    submitRating,
    checkExisting,
  }
}
