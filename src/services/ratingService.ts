import { supabase } from '../lib/supabase'

export type RatingCategory = 'property' | 'renter'

export interface Rating {
  id: string
  lease_id: string
  reviewer_id: string
  reviewee_id: string | null
  property_id: string | null
  category: RatingCategory
  score: number
  comment: string | null
  created_at: string
}

export interface RatingWithReviewer extends Rating {
  reviewer?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export interface RatingResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface RatingStats {
  avgRating: number
  totalReviews: number
}

export async function fetchPropertyRatings(
  propertyId: string
): Promise<RatingResult<RatingWithReviewer[]>> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        reviewer:profiles!ratings_reviewer_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('property_id', propertyId)
      .eq('category', 'property')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as RatingWithReviewer[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch ratings',
    }
  }
}

export async function fetchPropertyRatingStats(
  propertyIds: string[]
): Promise<RatingResult<Record<string, RatingStats>>> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('property_id, score')
      .in('property_id', propertyIds)
      .eq('category', 'property')

    if (error) {
      return { success: false, error: error.message }
    }

    const stats: Record<string, RatingStats> = {}

    propertyIds.forEach(id => {
      const propertyRatings = data.filter(r => r.property_id === id)
      if (propertyRatings.length > 0) {
        const sum = propertyRatings.reduce((acc, r) => acc + r.score, 0)
        stats[id] = {
          avgRating: sum / propertyRatings.length,
          totalReviews: propertyRatings.length,
        }
      }
    })

    return { success: true, data: stats }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch rating stats',
    }
  }
}

export interface SubmitRatingParams {
  leaseId: string
  reviewerId: string
  category: RatingCategory
  score: number
  comment?: string
  propertyId?: string
  revieweeId?: string
}

export async function submitRating(
  params: SubmitRatingParams
): Promise<RatingResult<Rating>> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        lease_id: params.leaseId,
        reviewer_id: params.reviewerId,
        category: params.category,
        score: params.score,
        comment: params.comment || null,
        property_id: params.propertyId || null,
        reviewee_id: params.revieweeId || null,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Rating }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit rating',
    }
  }
}

export async function checkExistingRating(
  leaseId: string,
  reviewerId: string,
  category: RatingCategory
): Promise<RatingResult<Rating | null>> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('lease_id', leaseId)
      .eq('reviewer_id', reviewerId)
      .eq('category', category)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Rating | null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to check rating',
    }
  }
}
