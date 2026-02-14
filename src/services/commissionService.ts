import { supabase } from '../lib/supabase'

export type CommissionStatus = 'pending' | 'paid'

export interface Commission {
  id: string
  lease_id: string
  agent_id: string
  amount: number
  status: CommissionStatus
  paid_at: string | null
  created_at: string
}

export interface CommissionWithDetails extends Commission {
  lease?: {
    id: string
    monthly_rent: number
    property?: {
      id: string
      title: string
      address: string
    }
  }
}

export interface CommissionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchCommissionsByAgent(
  agentId: string
): Promise<CommissionResult<CommissionWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        lease:leases (
          id,
          monthly_rent,
          property:properties (
            id,
            title,
            address
          )
        )
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as CommissionWithDetails[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch commissions',
    }
  }
}

export interface CommissionStats {
  totalEarned: number
  totalPending: number
  totalPaid: number
  count: number
}

export async function fetchCommissionStats(
  agentId: string
): Promise<CommissionResult<CommissionStats>> {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('amount, status')
      .eq('agent_id', agentId)

    if (error) {
      return { success: false, error: error.message }
    }

    const stats: CommissionStats = {
      totalEarned: 0,
      totalPending: 0,
      totalPaid: 0,
      count: data.length,
    }

    data.forEach(c => {
      stats.totalEarned += c.amount
      if (c.status === 'pending') {
        stats.totalPending += c.amount
      } else {
        stats.totalPaid += c.amount
      }
    })

    return { success: true, data: stats }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch stats',
    }
  }
}
