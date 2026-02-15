import { supabase } from '../lib/supabase'
import type { Payment } from '../types/database'

export async function createPaymentIntent(leaseId: string, payerId: string): Promise<{
  clientSecret: string
  paymentId: string
}> {
  // Get fresh session token to avoid stale JWT 401s
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[Payment] createPaymentIntent:', {
    leaseId,
    payerId,
    hasSession: !!session,
    tokenPrefix: session?.access_token?.substring(0, 20) || 'NONE',
  })

  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { lease_id: leaseId, payer_id: payerId },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  })

  console.log('[Payment] invoke result:', { data, error, dataType: typeof data })

  if (error) {
    console.error('[Payment] Edge Function error:', error)
    throw new Error(error.message || 'Failed to create payment intent')
  }

  // Handle case where SDK returns stringified JSON instead of parsed object
  const parsed = typeof data === 'string' ? JSON.parse(data) : data

  if (parsed?.error) {
    console.error('[Payment] Function returned error:', parsed.error)
    throw new Error(parsed.error)
  }
  if (!parsed?.clientSecret) {
    console.error('[Payment] No clientSecret in response. Keys:', Object.keys(parsed || {}))
    throw new Error('No client secret returned')
  }

  return { clientSecret: parsed.clientSecret, paymentId: parsed.paymentId }
}

export async function confirmPayment(paymentId: string, paymentIntentId: string): Promise<{
  success: boolean
  payment: Payment
}> {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: { payment_id: paymentId, payment_intent_id: paymentIntentId },
  })

  if (error) throw new Error(error.message || 'Failed to confirm payment')
  if (!data?.success) throw new Error(data?.error || 'Payment confirmation failed')

  return { success: true, payment: data.payment }
}

export async function fetchDepositPayment(leaseId: string): Promise<Payment | null> {
  const { data, error } = await (supabase
    .from('payments') as any)
    .select('*')
    .eq('lease_id', leaseId)
    .eq('payment_type', 'deposit')
    .eq('status', 'completed')
    .maybeSingle()

  if (error) {
    console.error('Error fetching deposit payment:', error)
    return null
  }

  return data
}
