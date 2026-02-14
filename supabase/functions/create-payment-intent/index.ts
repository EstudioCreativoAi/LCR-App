import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lease_id, payer_id } = await req.json()

    if (!lease_id || !payer_id) {
      throw new Error('lease_id and payer_id are required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // 1. Fetch the lease
    const { data: lease, error: leaseError } = await supabaseClient
      .from('leases')
      .select('*, properties:property_id(landlord_id, agent_id, address)')
      .eq('id', lease_id)
      .single()

    if (leaseError || !lease) {
      throw new Error(`Lease not found: ${leaseError?.message}`)
    }

    // 2. Verify payer is the renter on this lease
    if (payer_id !== lease.renter_id) {
      throw new Error('Unauthorized: payer must be the lease renter')
    }

    // 3. Check for existing completed deposit payment
    const { data: existingPayment } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('lease_id', lease_id)
      .eq('payment_type', 'deposit')
      .eq('status', 'completed')
      .maybeSingle()

    if (existingPayment) {
      throw new Error('Deposit has already been paid for this lease')
    }

    const depositAmount = lease.deposit_amount || lease.monthly_rent || 0
    if (depositAmount <= 0) {
      throw new Error('Invalid deposit amount')
    }

    // 4. Create Stripe PaymentIntent (amount in centavos for MXN)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100),
      currency: 'mxn',
      metadata: {
        lease_id,
        payer_id,
        type: 'deposit',
      },
    })

    // 5. Insert pending payment record
    const recipientId = lease.properties?.landlord_id
    if (!recipientId) {
      throw new Error('Could not determine landlord for this lease')
    }

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        lease_id,
        payer_id,
        recipient_id: recipientId,
        amount_mxn: depositAmount,
        payment_type: 'deposit',
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single()

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`)
    }

    // 6. Return client secret
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
