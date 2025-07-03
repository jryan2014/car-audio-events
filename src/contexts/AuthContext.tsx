import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
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

      const profile = {
        id: data.id,
        name: data.name || data.email,
        email: data.email,
        membershipType: data.membership_type || 'competitor',
        status: data.status || 'active',
        verificationStatus: data.verification_status || 'verified',
        location: data.location || '',
        phone: data.phone || '',
        website: data.website || '',
        bio: data.bio || '',
        companyName: data.company_name || '',
        subscriptionPlan: data.subscription_plan || 'basic',
        requiresPasswordChange: false,
        passwordChangedAt: undefined
      };
      

      return profile;
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
          
          // Check if this is a Google OAuth user without a profile
          const userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile && session.user.app_metadata?.provider === 'google') {
            console.log('🔄 Creating profile for Google OAuth user...');
            
            // Create profile for Google OAuth user
            try {
              const { error: profileError } = await supabase
                .from('users')
                .insert([{
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Google User',
                  membership_type: 'competitor', // Default membership type
                  status: 'active',
                  verification_status: 'verified', // Google users are pre-verified
                  email_notifications: true,
                  marketing_emails: false
                }]);

              if (profileError) {
                console.error('Failed to create Google user profile:', profileError);
              } else {
                console.log('✅ Google user profile created successfully');
                // Fetch the newly created profile
                const newProfile = await fetchUserProfile(session.user.id);
                setUser(newProfile);
              }
            } catch (error) {
              console.error('Error creating Google user profile:', error);
            }
          } else {
            setUser(userProfile);
          }
          
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
        
        // Update login tracking
        try {
          // First get current login count
          const { data: userData } = await supabase
            .from('users')
            .select('login_count')
            .eq('id', data.user.id)
            .single();
          
          const currentCount = userData?.login_count || 0;
          
          await supabase
            .from('users')
            .update({
              last_login_at: new Date().toISOString(),
              login_count: currentCount + 1
            })
            .eq('id', data.user.id);
          console.log('✅ Login tracking updated');
        } catch (trackingError) {
          console.warn('⚠️ Failed to update login tracking:', trackingError);
        }
        
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

  const register = async (userData: any): Promise<void> => {
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
            location: userData.location,
            phone: userData.phone,
            company_name: userData.companyName
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Create user profile with enhanced data
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email.trim(),
          name: userData.name,
          membership_type: userData.membershipType,
          location: userData.location,
          phone: userData.phone,
          company_name: userData.companyName,
          website: userData.website,
          billing_address: userData.billingAddress,
          billing_city: userData.billingCity,
          billing_state: userData.billingState,
          billing_zip: userData.billingZip,
          billing_country: userData.billingCountry,
          shipping_address: userData.shippingAddress,
          shipping_city: userData.shippingCity,
          shipping_state: userData.shippingState,
          shipping_zip: userData.shippingZip,
          shipping_country: userData.shippingCountry,
          email_notifications: userData.emailNotifications,
          marketing_emails: userData.marketingEmails,
          status: 'active',
          verification_status: 'pending'
        }]);

      if (profileError) {
        throw profileError;
      }
      
      console.log('✅ Registration successful for:', userData.email);

      // Queue the welcome email using the new system
      try {
        await supabase.functions.invoke('queue-email', {
          body: {
            recipient: userData.email,
            template_name: 'welcome-email',
            variables: {
              name: userData.name,
              email: userData.email
            }
          }
        });
        console.log('✅ Welcome email queued successfully.');
      } catch (emailError) {
        console.error('⚠️ Failed to queue welcome email:', emailError);
        // Do not block registration if email queueing fails
      }

      // Don't return the user, just complete successfully
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
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.warn('Supabase logout warning:', error.message);
          // If session is missing, that's actually what we want
          if (error.message.includes('Auth session missing')) {
            console.log('✅ Session was already cleared - logout successful');
          }
        } else {
          console.log('✅ Supabase logout successful');
        }
      } catch (authError) {
        console.warn('Auth logout failed, but continuing with local cleanup:', authError);
      }
      
      // Clear ALL possible stored auth data
      console.log('🧹 Clearing all stored data...');
      
      // Clear specific Supabase keys
      const keysToRemove = [
        'supabase.auth.token',
        'sb-nqvisvranvjaghvrdaaz-auth-token',
        'sb-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear all localStorage and sessionStorage for good measure
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('✅ All data cleared');
      console.log('🔄 Redirecting to home page...');
      
      // Small delay to ensure clearing is complete
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
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

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('🔑 Starting Google OAuth login...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }

      console.log('✅ Google OAuth initiated successfully');
      // The actual login will be handled by the auth state change
    } catch (error) {
      console.error('Google login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      console.log('📧 Resending verification email to:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Resend verification error:', error);
        throw error;
      }

      console.log('✅ Verification email resent successfully');
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    updatePassword,
    refreshUser,
    resendVerificationEmail
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