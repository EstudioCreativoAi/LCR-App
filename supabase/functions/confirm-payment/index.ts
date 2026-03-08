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
    const { payment_id, payment_intent_id } = await req.json()

    if (!payment_id || !payment_intent_id) {
      throw new Error('payment_id and payment_intent_id are required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // 1. Verify the PaymentIntent status with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`)
    }

    // 2. Update payment record to completed
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', payment_id)
      .eq('stripe_payment_intent_id', payment_intent_id)
      .select()
      .single()

    if (paymentError || !payment) {
      throw new Error(`Failed to update payment: ${paymentError?.message}`)
    }

    // 3. Fetch lease details for downstream updates
    const { data: lease } = await supabaseClient
      .from('leases')
      .select('*, properties:property_id(id, landlord_id, agent_id, address)')
      .eq('id', payment.lease_id)
      .single()

    if (!lease) {
      throw new Error('Lease not found for payment')
    }

    // 4. Update lead status to 'Deposit Paid'
    const { data: lead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('property_id', lease.property_id)
      .eq('renter_id', payment.payer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lead) {
      await supabaseClient
        .from('leads')
        .update({ status: 'Deposit Paid', updated_at: new Date().toISOString() })
        .eq('id', lead.id)

      // Also update the payment record with lead_id
      await supabaseClient
        .from('payments')
        .update({ lead_id: lead.id })
        .eq('id', payment_id)
    }

    // 5. Pause the property (remove from feed)
    if (lease.properties?.id) {
      await supabaseClient
        .from('properties')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', lease.properties.id)
    }

    // 6. Update lease status to active
    await supabaseClient
      .from('leases')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', lease.id)

    // 6b. Create commission if agent exists (10% of deposit)
    const agentId = lease.properties?.agent_id
    if (agentId) {
      const commissionAmount = payment.amount_mxn * 0.10
      await supabaseClient
        .from('commissions')
        .insert({
          lease_id: lease.id,
          agent_id: agentId,
          amount_mxn: commissionAmount,
          status: 'pending',
        })
    }

    // 7. Fetch renter name for notification
    const { data: renter } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', payment.payer_id)
      .single()

    const renterName = renter?.full_name || 'Your renter'
    const propertyAddress = lease.properties?.address || 'your property'

    // 8. Create notifications
    await supabaseClient.from('notifications').insert([
      {
        user_id: payment.payer_id,
        type: 'lead_update',
        title: 'Welcome Home!',
        content: `Your deposit for ${propertyAddress} has been confirmed.`,
        metadata: { lease_id: lease.id, payment_id: payment.id },
      },
      {
        user_id: payment.recipient_id,
        type: 'lead_update',
        title: 'Deposit Received!',
        content: `${renterName} has paid the deposit for ${propertyAddress}.`,
        metadata: { lease_id: lease.id, payment_id: payment.id },
      },
    ])

    return new Response(
      JSON.stringify({ success: true, payment }),
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
