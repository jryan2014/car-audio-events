import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { emailService } from '../services/emailService';

interface User {
  id: string;
  name: string;
  email: string;
  membershipType: 'competitor' | 'pro_competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
  profileImage?: string;
  status?: string;
  verificationStatus?: string;
  location?: string;
  phone?: string;
  website?: string;
  bio?: string;
  companyName?: string;
  subscriptionPlan?: string;
  requiresPasswordChange?: boolean;
  passwordChangedAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      console.log('⚡ Fast fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('id,name,email,membership_type,status,verification_status,location,phone,website,bio,company_name,subscription_plan')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No profile found - user may need to complete registration');
        } else {
          console.error('Database error:', error.message);
        }
        return null;
      }

      if (!data?.email) {
        console.error('Invalid user profile - missing email');
        return null;
      }

      console.log('⚡ Profile fetched quickly:', data.email, 'Type:', data.membership_type);

      return {
        id: data.id,
        name: data.name || data.email,
        email: data.email,
        membershipType: data.membership_type || 'competitor',
        status: data.status,
        verificationStatus: data.verification_status,
        location: data.location,
        phone: data.phone,
        website: data.website,
        bio: data.bio,
        companyName: data.company_name,
        subscriptionPlan: data.subscription_plan,
        requiresPasswordChange: false, // Default value since column doesn't exist
        passwordChangedAt: undefined // Default value since column doesn't exist
      };
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session?.user) {
            setSession(session);
            const userProfile = await fetchUserProfile(session.user.id);
            setUser(userProfile);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 SIGNED_IN event - user ID:', session.user.id);
          setSession(session);
          
          // Skip profile fetch here - login function handles it
          console.log('⚡ Skipping profile fetch in auth state change - handled by login function');
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session load
          if (session?.user) {
            setSession(session);
            const userProfile = await fetchUserProfile(session.user.id);
            setUser(userProfile);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔑 Starting login process for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      if (data.user && data.session) {
        console.log('✅ Auth successful, setting session and fetching profile...');
        setSession(data.session);
        
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setUser(userProfile);
          console.log('✅ Login complete for:', userProfile.email, 'Type:', userProfile.membershipType);
        } else {
          console.warn('⚠️ No profile found, but auth successful');
          setUser(null);
        }
      } else {
        throw new Error('No user data returned from login');
      }
    } catch (error) {
      console.error('Login error:', error);
      setSession(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false); // ALWAYS set loading to false
    }
  };

  const register = async (userData: any) => {
    try {
      setLoading(true);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.trim(),
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            membership_type: userData.membershipType,
            location: userData.location
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email.trim(),
          name: userData.name,
          membership_type: userData.membershipType,
          location: userData.location,
          status: 'pending',
          verification_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Profile creation failed');
      }

      // Set user data
      if (authData.session) {
        setSession(authData.session);
        const userProfile = await fetchUserProfile(authData.user.id);
        setUser(userProfile);
      }

      // Send welcome email
      try {
        await emailService.sendTemplatedEmail(
          userData.email,
          'welcome',
          {
            firstName: userData.name.split(' ')[0] || userData.name,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        );
      } catch (emailError) {
        console.warn('Welcome email failed:', emailError);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      setLoading(true);
      
      // Clear local state immediately
      setSession(null);
      setUser(null);
      
      // Try to sign out from Supabase, but don't fail if session is already gone
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase logout warning:', error.message);
          // If session is missing, that's actually what we want
          if (error.message.includes('Auth session missing')) {
            console.log('✅ Session was already cleared - logout successful');
          }
        } else {
          console.log('✅ Logout successful');
        }
      } catch (authError) {
        console.warn('Auth logout failed, but continuing with local cleanup:', authError);
      }
      
      // Clear any stored auth data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      console.log('🔄 Redirecting to home page...');
      // Force page reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if everything fails, force clear and redirect
      setSession(null);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      throw error;
    }

    // Update password change timestamp
    if (user) {
      await supabase
        .from('users')
        .update({
          requires_password_change: false,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user.id);
      setUser(userProfile);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}