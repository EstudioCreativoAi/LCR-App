import { supabase } from '../lib/supabase'

export type LeaseStatus = 'pending' | 'sent_for_signature' | 'active' | 'completed' | 'cancelled'

export interface Lease {
  id: string
  property_id: string
  renter_id: string
  landlord_id: string
  agent_id: string | null
  start_date: string
  end_date: string
  monthly_rent: number
  deposit_amount: number
  status: LeaseStatus
  envelope_id: string | null
  created_at: string
  updated_at: string
}

export interface LeaseWithDetails extends Lease {
  property?: {
    id: string
    title: string
    address: string
    property_images?: { image_url: string }[]
  }
  landlord?: {
    id: string
    full_name: string
  }
  renter?: {
    id: string
    full_name: string
    email: string | null
    avatar_url: string | null
  }
}

export interface LeaseResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchLeasesByRenter(
  renterId: string
): Promise<LeaseResult<LeaseWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties (
          id,
          title,
          address,
          property_images (image_url)
        ),
        landlord:profiles!leases_landlord_id_fkey (
          id,
          full_name
        )
      `)
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as LeaseWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch leases',
    }
  }
}

export async function fetchLeasesByOwner(
  ownerId: string
): Promise<LeaseResult<LeaseWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties (
          id,
          title,
          address,
          property_images (image_url)
        ),
        renter:profiles!leases_renter_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .or(`landlord_id.eq.${ownerId},agent_id.eq.${ownerId}`)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as LeaseWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch leases',
    }
  }
}

export interface CreateLeaseParams {
  propertyId: string
  renterId: string
  landlordId: string
  agentId?: string
  startDate: string
  endDate: string
  monthlyRent: number
  depositAmount: number
}

export async function createLease(
  params: CreateLeaseParams
): Promise<LeaseResult<Lease>> {
  try {
    const { data, error } = await supabase
      .from('leases')
      .insert({
        property_id: params.propertyId,
        renter_id: params.renterId,
        landlord_id: params.landlordId,
        agent_id: params.agentId || null,
        start_date: params.startDate,
        end_date: params.endDate,
        monthly_rent: params.monthlyRent,
        deposit_amount: params.depositAmount,
        status: 'pending' as LeaseStatus,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Lease }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create lease',
    }
  }
}

export async function executeLease(
  leadId: string
): Promise<LeaseResult<{ leaseId: string; envelopeId: string }>> {
  try {
    const response = await supabase.functions.invoke('lease-execution', {
      body: { lead_id: leadId },
    })

    if (response.error) {
      return { success: false, error: response.error.message }
    }

    return {
      success: true,
      data: {
        leaseId: response.data.lease_id,
        envelopeId: response.data.envelope_id,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to execute lease',
    }
  }
}

export async function updateLeaseStatus(
  leaseId: string,
  status: LeaseStatus
): Promise<LeaseResult<Lease>> {
  try {
    const { data, error } = await supabase
      .from('leases')
      .update({ status })
      .eq('id', leaseId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Lease }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update lease',
    }
  }
}
