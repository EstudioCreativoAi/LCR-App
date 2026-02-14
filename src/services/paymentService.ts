import { supabase } from '../lib/supabase'
import type { Payment } from '../types/database'

export async function createPaymentIntent(leaseId: string, payerId: string): Promise<{
  clientSecret: string
  paymentId: string
}> {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { lease_id: leaseId, payer_id: payerId },
  })

  if (error) throw new Error(error.message || 'Failed to create payment intent')
  if (!data?.clientSecret) throw new Error('No client secret returned')

  return { clientSecret: data.clientSecret, paymentId: data.paymentId }
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
