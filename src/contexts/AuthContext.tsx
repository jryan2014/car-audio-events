import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

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
  forceCleanupOrphanedSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number>(30); // Default 30 minutes

  // Load session timeout settings from admin configuration
  const loadSessionTimeout = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'session_timeout_minutes')
        .single();

      if (!error && data) {
        const timeoutMinutes = parseInt(data.value) || 30;
        setSessionTimeout(timeoutMinutes);
        console.log('📅 Session timeout loaded:', timeoutMinutes, 'minutes');
      }
    } catch (error) {
      console.log('Using default session timeout of 30 minutes');
    }
  };

  useEffect(() => {
    loadSessionTimeout();
  }, []);

  // Auto-logout based on inactivity
  const { resetTimer } = useInactivityTimer({
    timeout: sessionTimeout * 60 * 1000, // Convert minutes to milliseconds
    onTimeout: async () => {
      console.log('⏰ Session timeout - logging out user');
      await logout();
    },
    isActive: !!user // Only active when user is logged in
  });

  // Reset timer on user activity (handled by useInactivityTimer)
  useEffect(() => {
    if (user) {
      resetTimer();
    }
  }, [user, resetTimer]);

    const fetchUserProfile = async (userId: string): Promise<User | null> => {
      console.log('🔍 FETCH DEBUG: Starting profile fetch for user ID:', userId);

      // Add timeout to prevent hanging (shorter timeout for faster recovery)
      const isDev = import.meta.env.DEV;
      const timeoutMs = isDev ? 2000 : 4000; // 2s for dev, 4s for production

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Profile fetch timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
      });

      try {
        // Get the current auth session to check email
        const { data: session } = await supabase.auth.getSession();
        let data = null;
        let error = null;

        // For admin@caraudioevents.com, try email lookup first (more reliable)
        if (session?.session?.user?.email === 'admin@caraudioevents.com') {
          console.log('🔍 FETCH DEBUG: Admin user detected, using email lookup...');
          const emailQuery = supabase
            .from('users')
            .select(`
              id,
              email,
              name,
              membership_type,
              status,
              location,
              phone,
              company_name,
              verification_status,
              subscription_plan,
              last_login_at,
              created_at,
              login_count,
              failed_login_attempts
            `)
            .eq('email', 'admin@caraudioevents.com')
            .single();
          
          const emailResult = await Promise.race([emailQuery, timeoutPromise]) as any;
          data = emailResult.data;
          error = emailResult.error;
          
          if (data) {
            console.log('✅ FETCH DEBUG: Admin email lookup successful:', data);
          } else {
            console.error('❌ FETCH DEBUG: Admin email lookup failed:', error);
          }
        } else {
          // For other users, use ID lookup first
          console.log('🔍 FETCH DEBUG: Regular user, using ID lookup...');
          const queryPromise = supabase
            .from('users')
            .select(`
              id,
              email,
              name,
              membership_type,
              status,
              location,
              phone,
              company_name,
              verification_status,
              subscription_plan,
              last_login_at,
              created_at,
              login_count,
              failed_login_attempts
            `)
            .eq('id', userId)
            .single();

          const result = await Promise.race([queryPromise, timeoutPromise]) as any;
          data = result.data;
          error = result.error;

          // If ID lookup fails, try email fallback
          if (error && session?.session?.user?.email) {
            console.log('🔍 FETCH DEBUG: ID lookup failed, trying email fallback...');
            const fallbackQuery = supabase
              .from('users')
              .select(`
                id,
                email,
                name,
                membership_type,
                status,
                location,
                phone,
                company_name,
                verification_status,
                subscription_plan,
                last_login_at,
                created_at,
                login_count,
                failed_login_attempts
              `)
              .eq('email', session.session.user.email)
              .single();
            
            const fallbackResult = await Promise.race([fallbackQuery, timeoutPromise]) as any;
            data = fallbackResult.data;
            error = fallbackResult.error;
            
            if (data) {
              console.log('✅ FETCH DEBUG: Email fallback successful:', data);
            } else {
              console.error('❌ FETCH DEBUG: Email fallback also failed:', error);
            }
          }
        }

        console.log('🔍 FETCH DEBUG: Query completed:', { data, error });

        if (!data) {
          console.error('🔍 FETCH DEBUG: No data returned from query');
          return null;
        }

        if (!data?.email) {
          console.error('Invalid user profile - missing email');
          return null;
        }

        const profile = {
          id: data.id,
          name: data.name || data.email, // Use name if available, fallback to email
          email: data.email,
          membershipType: data.membership_type || 'competitor',
          status: data.status || 'active',
          verificationStatus: data.verification_status || 'verified',
          location: data.location || '',
          phone: data.phone || '',
          website: '', // Not available in current schema
          bio: '', // Not available in current schema
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
        console.log('🔍 AUTH DEBUG: Initializing auth state...');
        
        // Clear any existing session conflicts first
        const existingSession = localStorage.getItem('sb-nqvisvranvjaghvrdaaz-auth-token');
        if (existingSession) {
          console.log('🔍 AUTH DEBUG: Found existing session token');
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 AUTH DEBUG: Retrieved session:', session ? 'exists' : 'none');
        
        if (isMounted) {
          if (session?.user) {
            console.log('🔍 AUTH DEBUG: Session user found, fetching profile...');
            setSession(session);
            const userProfile = await fetchUserProfile(session.user.id);
            setUser(userProfile);
          } else {
            console.log('🔍 AUTH DEBUG: No session found');
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
          console.log('🔍 AUTH DEBUG: About to call fetchUserProfile');
          setSession(session);
          
          // Check user profile and handle Google OAuth properly
          const userProfile = await fetchUserProfile(session.user.id);
          console.log('🔍 AUTH DEBUG: fetchUserProfile returned:', userProfile);
          
          if (!userProfile && session.user.app_metadata?.provider === 'google') {
            console.log('🔒 Google OAuth user without existing account - blocking access');
            
            // Google user without existing account - sign them out and redirect
            setSession(null);
            setUser(null);
            setLoading(false);
            
            // Sign out immediately to prevent account creation
            await supabase.auth.signOut();
            
            // Redirect to pricing page with message
            localStorage.setItem('google_oauth_blocked', JSON.stringify({
              email: session.user.email,
              message: 'You must register for an account before using Google sign-in.'
            }));
            
            window.location.href = '/pricing?google_blocked=true';
            return;
          } else if (userProfile) {
            // Existing user - check verification and approval status
            console.log('👤 Existing user login:', userProfile.email, 'Status:', userProfile.status, 'Verification:', userProfile.verificationStatus);
            
            // Check email verification status (but allow existing verified users, admin, and users with null status)
            if (userProfile.verificationStatus === 'pending' && 
                userProfile.membershipType !== 'admin' && 
                userProfile.verificationStatus !== null) {
              console.log('📧 User needs email verification');
              setSession(null);
              setUser(null);
              setLoading(false);
              
              // Store user info for verification flow
              localStorage.setItem('pending_verification_email', userProfile.email);
              window.location.href = '/verify-email';
              return;
            }
            
            // Check manual approval status for business accounts (only block if explicitly pending)
            if (['retailer', 'manufacturer', 'organization'].includes(userProfile.membershipType) && 
                userProfile.status === 'pending' && 
                userProfile.verificationStatus !== 'pending') { // Only block if email is verified but account pending
              console.log('⏳ Business account pending manual approval');
              setSession(null);
              setUser(null);
              setLoading(false);
              
              localStorage.setItem('pending_approval_email', userProfile.email);
              window.location.href = '/pending-approval';
              return;
            }
            
            // User is verified and approved - allow access
            console.log('✅ AUTH DEBUG: Setting user and completing login');
            setUser(userProfile);
          } else {
            // No profile found for existing auth user - clean up orphaned session
            console.error('❌ Auth user exists but no profile found - cleaning up orphaned session');
            console.log('🧹 Signing out orphaned auth session...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            
            // Clear any stored auth data
            const keysToRemove = [
              'supabase.auth.token',
              'sb-nqvisvranvjaghvrdaaz-auth-token',
              'sb-auth-token'
            ];
            
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            });
            
            console.log('✅ Orphaned session cleaned up');
          }
          
          console.log('🔍 AUTH DEBUG: SIGNED_IN handler completing, setting loading false');
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
      
      // Check if this is a Google OAuth user completing registration
      const googleUserData = localStorage.getItem('google_oauth_user');
      let authData: any;
      
      if (googleUserData && userData.isGoogleOAuth) {
        // Google OAuth user - they're already authenticated, just need to create profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Google OAuth session expired. Please try again.');
        }
        authData = { user };
        console.log('📝 Creating profile for Google OAuth user:', user.email);
      } else {
        // Regular email/password registration
        const { data, error: authError } = await supabase.auth.signUp({
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

        if (!data.user) {
          throw new Error('User creation failed');
        }
        
        authData = data;
      }

      // Determine proper status based on membership type and registration method
      let initialStatus = 'active';
      let verificationStatus = 'pending';
      
      // Business accounts need manual approval after email verification
      if (['retailer', 'manufacturer', 'organization'].includes(userData.membershipType)) {
        initialStatus = 'pending'; // Will be pending until manual approval
        verificationStatus = 'pending'; // Must verify email first
      }
      
      // Google OAuth users still need email verification
      if (googleUserData && userData.isGoogleOAuth) {
        verificationStatus = 'pending';
        console.log('🔐 Google OAuth user requires email verification');
      }

      // Create user profile with basic data only
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email.trim(),
          membership_type: userData.membershipType,
          phone: userData.phone,
          company_name: userData.companyName,
          status: initialStatus
        }]);

      if (profileError) {
        throw profileError;
      }
      
      console.log('✅ Registration successful for:', userData.email);

      // Clean up Google OAuth data if this was a Google registration
      if (googleUserData && userData.isGoogleOAuth) {
        localStorage.removeItem('google_oauth_user');
        console.log('🧹 Cleaned up Google OAuth registration data');
      }

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

      // Send verification email for all new users (including Google OAuth)
      if (verificationStatus === 'pending') {
        try {
          const { error: verificationError } = await supabase.auth.resend({
            type: 'signup',
            email: userData.email,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`
            }
          });
          
          if (verificationError) {
            console.warn('⚠️ Failed to send verification email:', verificationError);
          } else {
            console.log('📧 Verification email sent to:', userData.email);
          }
        } catch (verificationError) {
          console.warn('⚠️ Verification email error:', verificationError);
        }
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
      
      // Clear specific Supabase keys (more targeted approach)
      const keysToRemove = [
        'supabase.auth.token',
        'sb-nqvisvranvjaghvrdaaz-auth-token',
        'sb-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('✅ Auth data cleared');
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
      
      // Clear auth keys even if logout fails
      const keysToRemove = [
        'supabase.auth.token',
        'sb-nqvisvranvjaghvrdaaz-auth-token',
        'sb-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
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
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
  };

  const refreshUser = async () => {
    if (session?.user) {
      console.log('🔄 Refreshing user profile...');
      const userProfile = await fetchUserProfile(session.user.id);
      if (userProfile) {
        setUser(userProfile);
        console.log('✅ User profile refreshed successfully');
      } else {
        console.warn('⚠️ Failed to refresh user profile');
      }
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

  const forceCleanupOrphanedSession = async () => {
    console.log('🧹 Force cleaning up any orphaned sessions...');
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Signout warning:', error);
    }
    
    setSession(null);
    setUser(null);
    
    // Clear all possible auth storage
    const keysToRemove = [
      'supabase.auth.token',
      'sb-nqvisvranvjaghvrdaaz-auth-token', 
      'sb-auth-token'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log('✅ Force cleanup completed');
    window.location.reload();
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
    resendVerificationEmail,
    forceCleanupOrphanedSession
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