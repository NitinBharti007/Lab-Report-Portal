import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getSession } from '@/lib/supabaseClient';
import { Loader } from '@/components/shared/loader';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);
const LOADING_TIMEOUT = 15000; // Increased to 15 seconds timeout

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to fetch user details
  const fetchUserDetails = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user details:", error);
      throw error;
    }
  };

  // Initialize auth function moved outside useEffect
  const initializeAuth = async () => {
    let timeoutId;
    try {
      // Set a timeout for loading state
      timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Authentication timeout. Please try again.");
      }, LOADING_TIMEOUT);

      // First try to get the session directly from Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw sessionError;
      }

      if (currentSession?.user) {
        setUser(currentSession.user);
        setIsAuthenticated(true);
        try {
          const details = await fetchUserDetails(currentSession.user.id);
          setUserDetails(details);
        } catch (detailsError) {
          console.error("Error fetching user details:", detailsError);
          // Don't throw here, as we still have a valid session
        }
      } else {
        // If no session found, redirect to login immediately
        setUser(null);
        setUserDetails(null);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
        return; // Exit early since we don't need to try refreshing
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      setError(error.message);
      setUser(null);
      setUserDetails(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      await initializeAuth();

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setIsAuthenticated(!!session);
          
          if (session?.user) {
            try {
              const details = await fetchUserDetails(session.user.id);
              if (mounted) {
                setUserDetails(details);
              }
            } catch (error) {
              console.error("Error fetching user details:", error);
              if (mounted) {
                setUserDetails(null);
                setError(error.message);
                navigate('/login', { replace: true });
              }
            }
          } else {
            if (mounted) {
              setUserDetails(null);
              navigate('/login', { replace: true });
            }
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    setupAuth();
  }, [navigate]);

  const updateUserDetails = (newDetails) => {
    setUserDetails(prev => ({ ...prev, ...newDetails }));
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserDetails(null);
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error.message);
      setError(error.message);
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              initializeAuth();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
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
      updateUserDetails,
      loading,
      error
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