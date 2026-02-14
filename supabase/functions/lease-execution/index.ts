import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { property_id, renter_id } = await req.json()

    if (!property_id || !renter_id) {
      throw new Error('property_id and renter_id are required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch property and renter details
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('*, landlord_id(id, full_name)')
      .eq('id', property_id)
      .single()

    if (propertyError || !property) {
      throw new Error(`Property not found: ${propertyError?.message}`)
    }

    const { data: renter, error: renterError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', renter_id)
      .single()

    if (renterError || !renter) {
      throw new Error(`Renter not found: ${renterError?.message}`)
    }

    // 2. Pre-fill lease data (logic for template)
    const monthlyRent = property.monthly_rent_mxn
    const depositAmount = monthlyRent // Standard deposit is one month rent
    const landlordName = property.landlord_id.full_name || 'Owner'
    const renterName = renter.full_name || 'Renter'

    console.log(`Preparing lease for ${renterName} at ${property.address}`)

    // 3. Integrate with DocuSign (Placeholder)
    // In a real implementation, you would use the DocuSign API here:
    // - Authenticate with DocuSign
    // - Create an envelope
    // - Add documents and recipients
    // - Send the envelope
    
    // Simulating DocuSign API call
    const mockEnvelopeId = `docusign-${crypto.randomUUID()}`
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 4. Update or create the 'leases' table entry
    const { data: lease, error: leaseError } = await supabaseClient
      .from('leases')
      .upsert({
        property_id,
        renter_id,
        monthly_rent: monthlyRent,
        deposit_amount: depositAmount,
        status: 'sent_for_signature',
        envelope_id: mockEnvelopeId,
        start_date: new Date().toISOString().split('T')[0], // Mock start date
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] // Mock 1 year lease
      })
      .select()
      .single()

    if (leaseError) {
      throw new Error(`Failed to update lease: ${leaseError.message}`)
    }

    return new Response(
      JSON.stringify({
        message: 'Lease sent for signature successfully',
        lease,
        envelope_id: mockEnvelopeId
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
