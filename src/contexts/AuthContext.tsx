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
      console.log('🔍 Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.error('No user profile found for ID:', userId);
        return null;
      }

      console.log('✅ User profile fetched:', data.email, 'Type:', data.membership_type);

      return {
        id: data.id,
        name: data.name || data.email,
        email: data.email,
        membershipType: data.membership_type,
        status: data.status,
        verificationStatus: data.verification_status,
        location: data.location,
        phone: data.phone,
        website: data.website,
        bio: data.bio,
        companyName: data.company_name,
        subscriptionPlan: data.subscription_plan,
        requiresPasswordChange: data.require_password_change || false,
        passwordChangedAt: data.password_changed_at
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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
          const userProfile = await fetchUserProfile(session.user.id);
          console.log('👤 User profile result:', userProfile ? 'SUCCESS' : 'FAILED');
          setUser(userProfile);
          setLoading(false); // Force loading to false after profile fetch
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
      
      // Clear any existing state first
      setSession(null);
      setUser(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      if (data.user && data.session) {
        console.log('✅ Auth successful, fetching profile...');
        setSession(data.session);
        
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setUser(userProfile);
          console.log('✅ Login complete for:', userProfile.email, 'Type:', userProfile.membershipType);
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } else {
        throw new Error('No user data returned from login');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Clear state on error
      setSession(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
        // Don't throw error - we've already cleared local state
      } else {
        console.log('✅ Logout successful');
      }
      
      // Force page reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state and redirect
      setSession(null);
      setUser(null);
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