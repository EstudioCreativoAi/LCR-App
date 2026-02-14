import { useState, useEffect, useCallback } from 'react'
import * as leadService from '../services/leadService'
import * as leaseService from '../services/leaseService'
import type { LeadWithDetails, LeadStatus } from '../services/leadService'

export interface UseLeadsReturn {
  leads: LeadWithDetails[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateStatus: (leadId: string, status: LeadStatus) => Promise<boolean>
  executeLease: (leadId: string) => Promise<boolean>
}

export function useLeads(ownerId: string | null): UseLeadsReturn {
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    if (!ownerId) {
      setLeads([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await leadService.fetchLeadsByOwner(ownerId)

    if (result.success && result.data) {
      setLeads(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch leads')
    }

    setIsLoading(false)
  }, [ownerId])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const refetch = useCallback(async () => {
    await fetchLeads()
  }, [fetchLeads])

  const updateStatus = useCallback(async (leadId: string, status: LeadStatus): Promise<boolean> => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status } : lead
      )
    )

    const result = await leadService.updateLeadStatus(leadId, status)

    if (!result.success) {
      await refetch()
      setError(result.error ?? 'Failed to update status')
      return false
    }

    return true
  }, [refetch])

  const executeLease = useCallback(async (leadId: string): Promise<boolean> => {
    const result = await leaseService.executeLease(leadId)

    if (!result.success) {
      setError(result.error ?? 'Failed to execute lease')
      return false
    }

    await updateStatus(leadId, 'lease_sent')
    return true
  }, [updateStatus])

  return {
    leads,
    isLoading,
    error,
    refetch,
    updateStatus,
    executeLease,
  }
}

export interface UseRenterLeadsReturn {
  leads: LeadWithDetails[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  expressInterest: (propertyId: string, landlordId: string) => Promise<boolean>
}

export function useRenterLeads(renterId: string | null): UseRenterLeadsReturn {
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    if (!renterId) {
      setLeads([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await leadService.fetchLeadsByRenter(renterId)

    if (result.success && result.data) {
      setLeads(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch leads')
    }

    setIsLoading(false)
  }, [renterId])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const refetch = useCallback(async () => {
    await fetchLeads()
  }, [fetchLeads])

  const expressInterest = useCallback(async (
    propertyId: string,
    landlordId: string
  ): Promise<boolean> => {
    if (!renterId) return false

    const existingCheck = await leadService.checkExistingLead(propertyId, renterId)
    if (existingCheck.data) {
      setError('You have already expressed interest in this property')
      return false
    }

    const result = await leadService.createLead(propertyId, renterId, landlordId)

    if (!result.success) {
      setError(result.error ?? 'Failed to express interest')
      return false
    }

    await refetch()
    return true
  }, [renterId, refetch])

  return {
    leads,
    isLoading,
    error,
    refetch,
    expressInterest,
  }
}
