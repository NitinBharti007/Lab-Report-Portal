import { createClient } from '@supabase/supabase-js'

// Temporary hardcoded values for debugging
const supabaseUrl = 'https://pxycafbswegyrxqiazsc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Environment variables:', {
  url: supabaseUrl,
  key: supabaseAnonKey,
  allEnv: import.meta.env
})

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
    storageKey: 'labportal-auth-token',
    storage: {
      getItem: (key) => {
        try {
          const value = localStorage.getItem(key)
          return value ? JSON.parse(value) : null
        } catch (error) {
          return null
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value))
        } catch (error) {
          console.error('Error storing auth token:', error)
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key)
        } catch (error) {
          console.error('Error removing auth token:', error)
        }
      }
    }
  }
})

// Cache the session check
let sessionCache = null
let lastSessionCheck = 0
const CACHE_DURATION = 5000 // 5 seconds

export const getSession = async () => {
  const now = Date.now()
  
  // Return cached session if it's still valid
  if (sessionCache && (now - lastSessionCheck) < CACHE_DURATION) {
    return sessionCache
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error

    // Update cache
    sessionCache = session
    lastSessionCheck = now
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

// Subscribe to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    sessionCache = session
    lastSessionCheck = Date.now()
  } else if (event === 'SIGNED_OUT') {
    sessionCache = null
    lastSessionCheck = 0
  }
})
