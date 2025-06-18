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

    console.log('Auth check details:', {
      email,
      foundUser: !!existingUser,
      existingUserId: existingUser?.id,
      existingUserEmail: existingUser?.email,
      authDataUsers: authData?.users?.length || 0,
      emailMatches: existingUser?.email === email
    })

    // Check if we have a valid existing user with matching email
    const validExistingUser = existingUser && existingUser.email === email ? existingUser : null

    if (validExistingUser) {
      console.log('Email matches, proceeding with existing user')
    } else if (existingUser) {
      console.log('Email mismatch detected:', {
        requestedEmail: email,
        foundUserEmail: existingUser.email
      })
    }

    if (validExistingUser) {
      // Check if user exists in users table
      const { data: existingDbUser, error: userError } = await supabase
        .from('users')
        .select('id, clinic_id, name')
        .eq('user_id', validExistingUser.id)
        .single()

      console.log('Users table check:', {
        existingDbUser: !!existingDbUser,
        existingDbUserId: existingDbUser?.id,
        existingDbUserClinicId: existingDbUser?.clinic_id,
        existingDbUserName: existingDbUser?.name,
        userError: userError?.message
      })

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
        console.log('User exists in both tables:', {
          requestedClinicId: clinic_id,
          existingClinicId: existingDbUser.clinic_id,
          isAlreadyAssociated: existingDbUser.clinic_id === clinic_id
        })
        
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

        // Only update users table, don't update auth metadata to avoid affecting current user session
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            clinic_id,
            name: name || existingDbUser.name,
            last_modified: new Date().toISOString()
          })
          .eq('user_id', validExistingUser.id)

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
            user_id: validExistingUser.id,
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
          user_id: validExistingUser.id,
          email,
          name: name || validExistingUser.user_metadata?.name || '',
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
            name: name || validExistingUser.user_metadata?.name || '',
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
          user_id: validExistingUser.id,
          email,
          clinic_id,
          name: name || validExistingUser.user_metadata?.name || ''
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // User doesn't exist in auth - send invitation directly to create user
    console.log('User does not exist in auth, sending invitation to create user')
    
    // Send invitation email first - this will create the user in auth
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
      return new Response(JSON.stringify({ 
        error: 'Failed to send invitation',
        details: inviteData.error?.message || 'Failed to send invitation'
      }), {
        status: inviteResponse.status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    // Now check if the user was created in auth
    const authCheckResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })
    
    const authCheckData = await authCheckResponse.json()
    const createdUser = authCheckData?.users?.[0]

    if (createdUser) {
      console.log('User created successfully via invitation:', createdUser.id)
      
      // Check if email already exists in users table
      const { data: existingEmailUser, error: emailCheckError } = await supabase
        .from('users')
        .select('id, user_id, clinic_id, name')
        .eq('email', email)
        .single()

      console.log('Email check in users table after invitation:', {
        existingEmailUser: !!existingEmailUser,
        existingEmailUserId: existingEmailUser?.id,
        existingEmailUserClinicId: existingEmailUser?.clinic_id,
        emailCheckError: emailCheckError?.message
      })

      if (existingEmailUser) {
        // Email already exists in users table - update the existing record
        console.log('Email exists in users table, updating existing record')
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            user_id: createdUser.id, // Update with new auth user ID
            name: name || existingEmailUser.name,
            clinic_id,
            last_modified: new Date().toISOString()
          })
          .eq('id', existingEmailUser.id)

        if (updateError) {
          console.error('Error updating existing user record:', updateError)
          // Continue anyway since the invitation was sent successfully
        }
      } else {
        // Create new record in users table with the contact data
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            user_id: createdUser.id,
            email,
            name: name || '',
            clinic_id,
            role: 'user',
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
          }])

        if (insertError) {
          console.error('Error creating user record:', insertError)
          // Continue anyway since the invitation was sent successfully
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'User created and invitation sent successfully', 
          user: {
            id: createdUser.id,
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
    } else {
      // User was not created - this might happen if there's an issue with the invitation
      console.error('User was not created via invitation')
      return new Response(JSON.stringify({ 
        error: 'Failed to create user via invitation',
        details: 'User was not created in auth system'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }
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
