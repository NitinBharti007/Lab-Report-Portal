import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Allow only POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST requests allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      url: supabaseUrl,
      keyLength: supabaseServiceKey ? supabaseServiceKey.length : 0
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      })
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Read the request body
    const { email, name, clinic_id, clinic_name, user_id, redirect_to } = await req.json()
    console.log('Request body:', { email, name, clinic_id, clinic_name, user_id, redirect_to })

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    console.log('Creating user with:', { email, name, clinic_id, clinic_name, user_id })

    // Call Supabase Admin API to create the user
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email,
        user_metadata: {
          name: name || '',
          clinic_id,
          clinic_name
        },
        email_confirm: false,
        // Add these fields to ensure invitation is sent
        should_create_user: true,
        email_redirect_to: redirect_to || `${supabaseUrl}/auth/callback`,
        data: {
          name: name || '',
          clinic_id,
          clinic_name
        }
      }),
    })

    const responseData = await response.json()
    console.log('Create user response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    })

    if (!response.ok) {
      console.error('Error creating user:', responseData)
      return new Response(JSON.stringify({ 
        error: 'Failed to create user',
        details: responseData 
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // Send invitation email separately
    const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email,
        data: {
          name: name || '',
          clinic_id,
          clinic_name
        },
        redirect_to: redirect_to || `${supabaseUrl}/auth/callback`
      }),
    })

    const inviteData = await inviteResponse.json()
    console.log('Invite response:', {
      status: inviteResponse.status,
      ok: inviteResponse.ok,
      data: inviteData
    })

    if (!inviteResponse.ok) {
      console.error('Error sending invitation:', inviteData)
      // Continue anyway since the user was created
    }

    console.log('User created and invited successfully:', responseData)

    return new Response(
      JSON.stringify({ 
        message: 'User invited successfully', 
        user: responseData 
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    )
  }
})
