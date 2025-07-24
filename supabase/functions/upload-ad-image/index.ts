import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the file from form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const advertisementId = formData.get('advertisementId') as string

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${user.id}/${fileName}`

    // Use service role client for upload
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload file
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ad-images')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ad-images')
      .getPublicUrl(storagePath)

    // Save to database
    const { data: imageRecord, error: dbError } = await supabaseClient
      .from('advertisement_images')
      .insert({
        advertisement_id: advertisementId,
        user_id: user.id,
        image_url: publicUrl,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_primary: true,
      })
      .select()
      .single()

    if (dbError) {
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from('ad-images').remove([storagePath])
      throw dbError
    }

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl,
        storagePath,
        imageRecord,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})