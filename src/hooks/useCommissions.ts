import { useState, useEffect, useCallback } from 'react'
import * as commissionService from '../services/commissionService'
import type { CommissionWithDetails, CommissionStats } from '../services/commissionService'

export interface UseCommissionsReturn {
  commissions: CommissionWithDetails[]
  stats: CommissionStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCommissions(agentId: string | null): UseCommissionsReturn {
  const [commissions, setCommissions] = useState<CommissionWithDetails[]>([])
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!agentId) {
      setCommissions([])
      setStats(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const [commissionsResult, statsResult] = await Promise.all([
      commissionService.fetchCommissionsByAgent(agentId),
      commissionService.fetchCommissionStats(agentId),
    ])

    if (commissionsResult.success && commissionsResult.data) {
      setCommissions(commissionsResult.data)
    } else {
      setError(commissionsResult.error ?? 'Failed to fetch commissions')
    }

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }

    setIsLoading(false)
  }, [agentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    commissions,
    stats,
    isLoading,
    error,
    refetch,
  }
}
