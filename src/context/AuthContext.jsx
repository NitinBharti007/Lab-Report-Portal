import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Simple function to fetch user details
  const fetchUserDetails = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
    return data;
  };

  // Add updateUserDetails function
  const updateUserDetails = (newDetails) => {
    setUserDetails(newDetails);
  };

  // Handle session state
  const handleSession = async (session) => {
    const currentPath = window.location.pathname;
    const isAuthRoute = ['/login', '/forgot-password', '/reset-password', '/auth/callback'].includes(currentPath);

    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      const details = await fetchUserDetails(session.user.id);
      setUserDetails(details);
    } else {
      setUser(null);
      setUserDetails(null);
      setIsAuthenticated(false);
      // Only redirect to login if we're not already on an auth route
      if (!isAuthRoute) {
        navigate('/login', { replace: true });
      }
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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