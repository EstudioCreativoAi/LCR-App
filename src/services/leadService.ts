import { supabase } from '../lib/supabase'

export type LeadStatus = 'new' | 'contacted' | 'viewing_scheduled' | 'lease_sent'

export interface Lead {
  id: string
  property_id: string
  renter_id: string
  landlord_id: string
  agent_id: string | null
  status: LeadStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadWithDetails extends Lead {
  property?: {
    id: string
    title: string
    address: string
    price: number
    property_images?: { image_url: string }[]
  }
  renter?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export interface LeadResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchLeadsByOwner(
  ownerId: string
): Promise<LeadResult<LeadWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        property:properties (
          id,
          title,
          address,
          price,
          property_images (image_url)
        ),
        renter:profiles!leads_renter_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .or(`landlord_id.eq.${ownerId},agent_id.eq.${ownerId}`)
      .order('updated_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as LeadWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch leads',
    }
  }
}

export async function fetchLeadsByRenter(
  renterId: string
): Promise<LeadResult<LeadWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        property:properties (
          id,
          title,
          address,
          price,
          property_images (image_url)
        )
      `)
      .eq('renter_id', renterId)
      .order('updated_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as LeadWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch leads',
    }
  }
}

export async function createLead(
  propertyId: string,
  renterId: string,
  landlordId: string,
  agentId?: string
): Promise<LeadResult<Lead>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        property_id: propertyId,
        renter_id: renterId,
        landlord_id: landlordId,
        agent_id: agentId || null,
        status: 'new' as LeadStatus,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Lead }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create lead',
    }
  }
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  notes?: string
): Promise<LeadResult<Lead>> {
  try {
    const updates: Partial<Lead> = { status }
    if (notes !== undefined) {
      updates.notes = notes
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Lead }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update lead',
    }
  }
}

export async function checkExistingLead(
  propertyId: string,
  renterId: string
): Promise<LeadResult<Lead | null>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('property_id', propertyId)
      .eq('renter_id', renterId)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Lead | null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to check lead',
    }
  }
}
