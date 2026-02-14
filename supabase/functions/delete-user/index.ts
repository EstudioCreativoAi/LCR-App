import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function purgePropertyPhotosFolder(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ deletedCount: number }> {
  let deletedCount = 0
  const { data: propertyFolders } = await supabase.storage
    .from('property-photos')
    .list(userId)

  if (!propertyFolders || propertyFolders.length === 0) {
    return { deletedCount: 0 }
  }

  for (const folder of propertyFolders) {
    const folderPath = `${userId}/${folder.name}`
    const { data: files } = await supabase.storage
      .from('property-photos')
      .list(folderPath)

    if (files && files.length > 0) {
      const pathsToRemove = files
        .filter((f) => f.name)
        .map((f) => `${folderPath}/${f.name}`)
      const { error } = await supabase.storage
        .from('property-photos')
        .remove(pathsToRemove)
      if (!error) deletedCount += pathsToRemove.length
    }
  }

  return { deletedCount }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    let body: { user_id?: string } = {}
    try {
      body = req.method === 'POST' ? await req.json() : {}
    } catch {
      // empty body ok
    }

    const targetUserId = body.user_id ?? user.id
    if (targetUserId !== user.id) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You can only delete your own account',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', targetUserId)
      .maybeSingle()

    const { count: propertiesCount } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', targetUserId)

    const { count: leadsCount } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('renter_id', targetUserId)

    const metadata: Record<string, unknown> = {
      target_user_id: targetUserId,
      target_email: user.email ?? null,
      target_full_name: profile?.full_name ?? null,
      target_role: profile?.role ?? null,
      properties_to_delete: propertiesCount ?? 0,
      leads_to_delete: leadsCount ?? 0,
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'user.deleted',
      target_id: targetUserId,
      metadata,
    })

    if (auditError) {
      throw new Error(`Failed to log deletion: ${auditError.message}`)
    }

    const { deletedCount } = await purgePropertyPhotosFolder(supabaseAdmin, targetUserId)

    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteUserError) {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        action: 'user.deletion_failed',
        target_id: targetUserId,
        metadata: { ...metadata, error: deleteUserError.message },
      })
      throw new Error(`Failed to delete user: ${deleteUserError.message}`)
    }

    return new Response(
      JSON.stringify({
        message: 'User deleted successfully',
        metadata: {
          ...metadata,
          properties_deleted: propertiesCount ?? 0,
          leads_deleted: leadsCount ?? 0,
          storage_files_deleted: deletedCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: (err as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
