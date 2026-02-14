import { useState, useEffect, useCallback } from 'react'
import * as leaseService from '../services/leaseService'
import type { LeaseWithDetails } from '../services/leaseService'

export interface UseLeasesReturn {
  leases: LeaseWithDetails[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRenterLeases(renterId: string | null): UseLeasesReturn {
  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeases = useCallback(async () => {
    if (!renterId) {
      setLeases([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await leaseService.fetchLeasesByRenter(renterId)

    if (result.success && result.data) {
      setLeases(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch leases')
    }

    setIsLoading(false)
  }, [renterId])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  const refetch = useCallback(async () => {
    await fetchLeases()
  }, [fetchLeases])

  return {
    leases,
    isLoading,
    error,
    refetch,
  }
}

export function useOwnerLeases(ownerId: string | null): UseLeasesReturn {
  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeases = useCallback(async () => {
    if (!ownerId) {
      setLeases([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await leaseService.fetchLeasesByOwner(ownerId)

    if (result.success && result.data) {
      setLeases(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch leases')
    }

    setIsLoading(false)
  }, [ownerId])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  const refetch = useCallback(async () => {
    await fetchLeases()
  }, [fetchLeases])

  return {
    leases,
    isLoading,
    error,
    refetch,
  }
}
