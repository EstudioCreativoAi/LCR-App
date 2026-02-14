import { supabase } from '../lib/supabase'

export interface Property {
  id: string
  title: string
  description: string
  address: string
  city: string
  price: number
  bedrooms: number
  bathrooms: number
  area_sqm: number
  latitude: number | null
  longitude: number | null
  available_date: string
  is_available: boolean
  landlord_id: string
  created_at: string
  updated_at: string
}

export interface PropertyImage {
  id: string
  property_id: string
  image_url: string
  is_primary: boolean
  display_order: number
}

export interface PropertyWithImages extends Property {
  property_images: PropertyImage[]
  avg_rating?: number
  review_count?: number
}

export interface PropertyFilters {
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  availableBefore?: string
}

export interface PropertyResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchProperties(
  filters?: PropertyFilters
): Promise<PropertyResult<PropertyWithImages[]>> {
  try {
    let query = supabase
      .from('properties')
      .select(`
        *,
        property_images (*)
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }
    if (filters?.minPrice) {
      query = query.gte('price', filters.minPrice)
    }
    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice)
    }
    if (filters?.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms)
    }
    if (filters?.availableBefore) {
      query = query.lte('available_date', filters.availableBefore)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PropertyWithImages[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch properties',
    }
  }
}

export async function fetchPropertyById(
  propertyId: string
): Promise<PropertyResult<PropertyWithImages>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_images (*)
      `)
      .eq('id', propertyId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PropertyWithImages }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch property',
    }
  }
}

export async function fetchPropertiesByOwner(
  ownerId: string
): Promise<PropertyResult<PropertyWithImages[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_images (*)
      `)
      .eq('landlord_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PropertyWithImages[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch properties',
    }
  }
}

export interface CreatePropertyParams {
  title: string
  description: string
  address: string
  city: string
  price: number
  bedrooms: number
  bathrooms: number
  area_sqm: number
  latitude?: number
  longitude?: number
  available_date: string
  landlord_id: string
}

export async function createProperty(
  params: CreatePropertyParams
): Promise<PropertyResult<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...params,
        is_available: true,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Property }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create property',
    }
  }
}

export async function updateProperty(
  propertyId: string,
  updates: Partial<CreatePropertyParams>
): Promise<PropertyResult<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Property }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update property',
    }
  }
}

export async function deleteProperty(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete property',
    }
  }
}

export async function addPropertyImage(
  propertyId: string,
  imageUrl: string,
  isPrimary: boolean = false,
  displayOrder: number = 0
): Promise<PropertyResult<PropertyImage>> {
  try {
    const { data, error } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        image_url: imageUrl,
        is_primary: isPrimary,
        display_order: displayOrder,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PropertyImage }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add image',
    }
  }
}
