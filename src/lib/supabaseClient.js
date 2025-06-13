import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})

// Cache the session check with a shorter duration
let sessionCache = null
let lastSessionCheck = 0
const CACHE_DURATION = 2000 // Reduced to 2 seconds for more frequent checks

export const getSession = async () => {
  const now = Date.now()
  
  // Return cached session if it's still valid
  if (sessionCache && (now - lastSessionCheck) < CACHE_DURATION) {
    return sessionCache
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Session error:', error)
      throw error
    }

    // Update cache
    sessionCache = session
    lastSessionCheck = now
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    sessionCache = null
    lastSessionCheck = 0
    return null
  }
}

// Subscribe to auth state changes with improved error handling
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'Session exists' : 'No session')
  
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    sessionCache = session
    lastSessionCheck = Date.now()
  } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    sessionCache = null
    lastSessionCheck = 0
  }
})
