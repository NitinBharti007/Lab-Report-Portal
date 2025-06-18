import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader } from '@/components/shared/loader';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const navigate = useNavigate();
  const isProcessingSession = useRef(false);

  // Simple function to fetch user details with retry logic
  const fetchUserDetails = async (userId, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching user details:", error);
        // If the error is PGRST116 (no rows found), the user doesn't exist in our users table
        if (error.code === "PGRST116") {
          console.error("User not found in users table. User may not be properly registered.");
          return null;
        }
        
        // Retry up to 2 times for network or temporary database issues
        if (retryCount < 2 && (error.code === 'PGRST301' || error.code === 'PGRST302' || error.message.includes('network'))) {
          console.warn(`Retrying fetchUserDetails (attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return fetchUserDetails(userId, retryCount + 1);
        }
        
        return null;
      }
      return data;
    } catch (err) {
      console.error("Unexpected error in fetchUserDetails:", err);
      return null;
    }
  };

  // Add updateUserDetails function
  const updateUserDetails = (newDetails) => {
    setUserDetails(newDetails);
  };

  // Handle session state
  const handleSession = async (session) => {
    // Prevent infinite loops
    if (isProcessingSession.current) {
      return;
    }
    
    isProcessingSession.current = true;
    
    try {
      const currentPath = window.location.pathname;
      const isAuthRoute = ['/login', '/forgot-password', '/reset-password', '/auth/callback'].includes(currentPath);

      if (session?.user) {
        // Check if this is the same user (just metadata update) or a different user
        const isSameUser = user && user.id === session.user.id;
        
        // Only update user state if it's actually different
        if (!user || user.id !== session.user.id) {
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          // For same user, only update if there are actual changes
          const hasChanges = JSON.stringify(user) !== JSON.stringify(session.user);
          if (hasChanges) {
            setUser(session.user);
          }
        }
        
        // Only fetch user details if we don't already have them or if the user ID has changed
        // Skip fetching if it's the same user (likely just a metadata update)
        if (!userDetails || userDetails.user_id !== session.user.id) {
          const details = await fetchUserDetails(session.user.id);
          
          if (details) {
            setUserDetails(details);
          } else {
            // Only log out if this is a new session (not an existing one that might be temporarily unavailable)
            // Check if we're in the middle of an auth state change by comparing with current user
            if (!user || user.id !== session.user.id) {
              console.error("User details not found for new session. Logging out user.");
              setUser(null);
              setUserDetails(null);
              setIsAuthenticated(false);
              await supabase.auth.signOut();
              if (!isAuthRoute) {
                navigate('/login', { replace: true });
              }
            } else {
              // For existing sessions, just log the error but don't log out
              console.warn("User details temporarily unavailable for existing session. Keeping user logged in.");
            }
          }
        } else if (isSameUser) {
          // For same user metadata updates, just update the user object but keep existing details
          // This prevents the current user from being logged out when their metadata is updated
          // Only log once per actual change to prevent spam
          const hasChanges = JSON.stringify(user) !== JSON.stringify(session.user);
          if (hasChanges) {
            console.log("Auth state change detected for same user (metadata update). Keeping existing user details.");
          }
        }
      } else {
        setUser(null);
        setUserDetails(null);
        setIsAuthenticated(false);
        // Only redirect to login if we're not already on an auth route
        if (!isAuthRoute) {
          navigate('/login', { replace: true });
        }
      }
    } finally {
      // Reset the processing flag after a short delay to allow for state updates
      setTimeout(() => {
        isProcessingSession.current = false;
      }, 100);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only log significant auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log('🔐 Auth state change detected:', {
          event,
          sessionUserId: session?.user?.id,
          currentUserId: user?.id,
          isSameUser: user && session?.user && user.id === session.user.id
        });
      }
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email, password) => {
    try {
      // Don't set loading here as it's handled by the form
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { data: null, error };
      }

      // If login successful, update the session
      await handleSession(data.session);
      return { data, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { data: null, error };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUserDetails(null);
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader message="Loading..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      userDetails, 
      login, 
      logout,
      loading,
      updateUserDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};