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

    // Validate required fields
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email is required',
        details: 'Please provide a valid email address'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    if (!clinic_id) {
      return new Response(JSON.stringify({ 
        error: 'Clinic ID is required',
        details: 'Please provide a valid clinic ID'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // Check if user already exists in auth
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })
    
    const authData = await authResponse.json()
    console.log('Auth check response:', authData)

    if (!authResponse.ok) {
      console.error('Error checking existing auth user:', authData)
      return new Response(JSON.stringify({ 
        error: 'Error checking user existence',
        details: authData.error?.message || 'Failed to check user existence'
      }), {
        status: authResponse.status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    const existingUser = authData?.users?.[0]

    if (existingUser) {
      // Check if user exists in users table
      const { data: existingDbUser, error: userError } = await supabase
        .from('users')
        .select('id, clinic_id')
        .eq('user_id', existingUser.id)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking existing user:', userError)
        return new Response(JSON.stringify({ 
          error: 'Error checking user record',
          details: userError.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        })
      }

      if (existingDbUser) {
        // User exists in both auth and users table
        if (existingDbUser.clinic_id === clinic_id) {
          return new Response(JSON.stringify({ 
            error: 'User already associated',
            details: 'This user is already associated with this clinic'
          }), {
            status: 409, // Conflict
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            },
          })
        }

        // Update both auth metadata and users table
        const updateAuthResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_metadata: {
              name: name || existingDbUser.name,
              clinic_id,
              clinic_name
            }
          })
        })

        const updateAuthData = await updateAuthResponse.json()
        console.log('Update auth response:', updateAuthData)

        if (!updateAuthResponse.ok) {
          console.error('Error updating auth user metadata:', updateAuthData)
          return new Response(JSON.stringify({ 
            error: 'Failed to update user metadata',
            details: updateAuthData.error?.message || 'Failed to update user metadata'
          }), {
            status: updateAuthResponse.status,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            },
          })
        }

        // Update users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            clinic_id,
            name: name || existingDbUser.name,
            last_modified: new Date().toISOString()
          })
          .eq('user_id', existingUser.id)

        if (updateError) {
          console.error('Error updating user clinic association:', updateError)
          return new Response(JSON.stringify({ 
            error: 'Failed to update user association',
            details: updateError.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            },
          })
        }

        // Send a new invitation email
        const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            data: {
              name: name || existingDbUser.name,
              clinic_id,
              clinic_name
            },
            redirect_to: redirect_to || `${supabaseUrl}/auth/callback`
          })
        })

        const inviteData = await inviteResponse.json()
        console.log('Invite response:', inviteData)

        if (!inviteResponse.ok) {
          console.error('Error sending invitation:', inviteData)
          // Continue anyway since the user was updated successfully
        }

        return new Response(JSON.stringify({ 
          message: 'User associated with clinic successfully and invitation sent',
          user: {
            id: existingDbUser.id,
            user_id: existingUser.id,
            email,
            clinic_id,
            name: name || existingDbUser.name
          }
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        })
      }

      // User exists in auth but not in users table - create users record
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          user_id: existingUser.id,
          email,
          name: name || existingUser.user_metadata?.name || '',
          clinic_id,
          role: 'user',
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString()
        }])

      if (insertError) {
        console.error('Error creating user record:', insertError)
        return new Response(JSON.stringify({ 
          error: 'Failed to create user record',
          details: insertError.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        })
      }

      // Update auth metadata
      const updateAuthResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: {
            name: name || existingUser.user_metadata?.name || '',
            clinic_id,
            clinic_name
          }
        })
      })

      const updateAuthData = await updateAuthResponse.json()
      console.log('Update auth response:', updateAuthData)

      if (!updateAuthResponse.ok) {
        console.error('Error updating auth user metadata:', updateAuthData)
        // Continue anyway since the user record was created
      }

      // Send a new invitation email
      const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          data: {
            name: name || existingUser.user_metadata?.name || '',
            clinic_id,
            clinic_name
          },
          redirect_to: redirect_to || `${supabaseUrl}/auth/callback`
        })
      })

      const inviteData = await inviteResponse.json()
      console.log('Invite response:', inviteData)

      if (!inviteResponse.ok) {
        console.error('Error sending invitation:', inviteData)
        // Continue anyway since the user was created successfully
      }

      return new Response(JSON.stringify({ 
        message: 'User record created successfully and invitation sent',
        user: {
          user_id: existingUser.id,
          email,
          clinic_id,
          name: name || existingUser.user_metadata?.name || ''
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // User doesn't exist - create new user
    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        user_metadata: {
          name: name || '',
          clinic_id,
          clinic_name
        },
        email_confirm: false
      })
    })

    const createData = await createResponse.json()
    console.log('Create user response:', createData)

    if (!createResponse.ok) {
      console.error('Error creating auth user:', createData)
      return new Response(JSON.stringify({ 
        error: 'Failed to create user',
        details: createData.error?.message || 'Failed to create user'
      }), {
        status: createResponse.status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    if (!createData?.id) {
      console.error('Invalid user creation response:', createData)
      return new Response(JSON.stringify({ 
        error: 'Invalid user creation response',
        details: 'User was created but response was invalid'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // Create corresponding record in users table
    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        user_id: createData.id,
        email,
        name: name || '',
        clinic_id,
        role: 'user',
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString()
      }])

    if (insertError) {
      console.error('Error creating user record:', insertError)
      // Don't return error here since the auth user was created successfully
      // Just log the error and continue
    }

    // Send invitation email
    const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        data: {
          name: name || '',
          clinic_id,
          clinic_name
        },
        redirect_to: redirect_to || `${supabaseUrl}/auth/callback`
      })
    })

    const inviteData = await inviteResponse.json()
    console.log('Invite response:', inviteData)

    if (!inviteResponse.ok) {
      console.error('Error sending invitation:', inviteData)
      // Continue anyway since the user was created successfully
    }

    return new Response(
      JSON.stringify({ 
        message: 'User created and invitation sent successfully', 
        user: {
          id: createData.id,
          email,
          clinic_id,
          name: name || ''
        }
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
        details: err.message || 'An unexpected error occurred'
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
