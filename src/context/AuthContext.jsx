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

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        
        if (session?.user) {
          // Fetch user details if we have a session
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", session.user.id)
            .single();
          
          if (error) throw error;
          setUserDetails(data);
        } else {
          // Redirect to login if no session
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
        setUserDetails(null);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", session.user.id)
            .single();
          
          if (error) throw error;
          setUserDetails(data);
        } catch (error) {
          console.error("Error fetching user details:", error);
          setUserDetails(null);
          navigate('/login', { replace: true });
        }
      } else {
        setUserDetails(null);
        navigate('/login', { replace: true });
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const updateUserDetails = (newDetails) => {
    setUserDetails(prev => ({ ...prev, ...newDetails }));
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserDetails(null);
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error.message);
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
      updateUserDetails,
      loading
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