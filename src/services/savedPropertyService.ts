import { supabase } from '../lib/supabase'
import type { Property } from '../types/database'

export interface SavedPropertyWithDetails {
  id: string
  user_id: string
  property_id: string
  created_at: string
  property: Property
}

export interface SavedPropertyResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchSavedProperties(
  userId: string
): Promise<SavedPropertyResult<SavedPropertyWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select(`
        *,
        property:properties (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SavedPropertyWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch saved properties',
    }
  }
}

export async function saveProperty(
  userId: string,
  propertyId: string
): Promise<SavedPropertyResult<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .insert({ user_id: userId, property_id: propertyId })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as { id: string } }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save property',
    }
  }
}

export async function unsaveProperty(
  userId: string,
  propertyId: string
): Promise<SavedPropertyResult<null>> {
  try {
    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to unsave property',
    }
  }
}

export async function isPropertySaved(
  userId: string,
  propertyId: string
): Promise<SavedPropertyResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data !== null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to check saved status',
    }
  }
}
