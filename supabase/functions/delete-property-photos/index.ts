import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { old_record } = await req.json()
    const { id: propertyId, landlord_id: landlordId } = old_record

    console.log(`Cleaning up storage for property: ${propertyId}, landlord: ${landlordId}`)

    // 1. List all files in the property folder
    const folderPath = `${landlordId}/${propertyId}`
    const { data: files, error: listError } = await supabaseClient
      .storage
      .from('property-photos')
      .list(folderPath)

    if (listError) throw listError

    if (files && files.length > 0) {
      // 2. Delete all files
      const filesToRemove = files.map((x: any) => `${folderPath}/${x.name}`)
      const { error: deleteError } = await supabaseClient
        .storage
        .from('property-photos')
        .remove(filesToRemove)

      if (deleteError) throw deleteError
      console.log(`Successfully deleted ${files.length} files.`)
    } else {
      console.log('No files found to delete.')
    }

    return new Response(JSON.stringify({ message: 'Cleanup successful' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Cleanup error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
