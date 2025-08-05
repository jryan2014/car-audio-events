import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { activityLogger } from '../services/activityLogger';

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
  organizationId?: number;
  role?: string;
  // New fields for complete profile
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  taxId?: string;
  registrationProvider?: string;
  registrationCompleted?: boolean;
  // Security-related fields
  sessionValidatedAt?: string;
  permissionsCache?: string[];
  rolesCacheExpiry?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  originalAdminId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  forceCleanupOrphanedSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  getUserPermissions: () => Promise<string[]>;
  clearPermissionsCache: () => void;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionConflictDetected, setSessionConflictDetected] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number>(30); // Default 30 minutes
  const [permissionsCache, setPermissionsCache] = useState<Map<string, { permissions: string[]; expiry: number }>>(new Map());
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);

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
        // Session timeout loaded successfully
      }
    } catch (error) {
      // Using default session timeout of 30 minutes
    }
  };

  useEffect(() => {
    loadSessionTimeout();
  }, []);

  // Auto-logout based on inactivity
  const { resetTimer } = useInactivityTimer({
    timeout: sessionTimeout * 60 * 1000, // Convert minutes to milliseconds
    onTimeout: async () => {
      // Session timeout - logging out user
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

  // Periodically validate session
  useEffect(() => {
    if (!session) return;
    
    // Validate session every 5 minutes
    const interval = setInterval(async () => {
      const isValid = await validateSession();
      if (!isValid) {
        console.log('Session validation failed during periodic check');
        // Session was invalidated, auth state already cleared
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [session]);

    const fetchUserProfile = async (userId: string): Promise<User | null> => {
      // Starting profile fetch for user

      // Add timeout to prevent hanging (increased for better reliability)
      const isDev = import.meta.env.DEV;
      const timeoutMs = isDev ? 20000 : 15000; // 20s for dev, 15s for production

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Profile fetch timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
      });

      try {
        // Get the current auth session to check email
        const { data: session } = await supabase.auth.getSession();
        let data = null;
        let error = null;

        // FIX 3: Simplified admin profile lookup - remove special admin handling that causes timeouts
        // Use standard ID lookup for ALL users (including admins) for consistency and reliability
        // Using standard ID lookup for user
        const queryPromise = supabase
          .from('users')
          .select(`
            id,
            email,
            name,
            first_name,
            last_name,
            membership_type,
            status,
            location,
            phone,
            address,
            city,
            state,
            zip,
            country,
            company_name,
            tax_id,
            verification_status,
            subscription_plan,
            registration_provider,
            registration_completed,
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
          // ID lookup failed, trying email fallback
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
            // Email fallback successful
          } else {
            // Email fallback also failed
          }
        }

        // Query completed

        if (!data) {
          console.error('No data returned from query');
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
          passwordChangedAt: undefined,
          // New profile fields
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          country: data.country || 'United States',
          taxId: data.tax_id || '',
          registrationProvider: data.registration_provider || 'email',
          registrationCompleted: data.registration_completed || false
        };
        

        return profile;
      } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
    };

  // Helper function for login tracking (shared between email/password and OAuth)
  const updateLoginTracking = async (userId: string) => {
    try {
      // Login tracking disabled to prevent console errors
      // The users table doesn't have the expected login tracking columns
      // This is safe to skip as it's not essential functionality
      if (import.meta.env.DEV) {
        console.log('Login tracking skipped for user:', userId);
      }
    } catch (trackingError) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Login tracking error:', trackingError);
      }
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Initializing auth state
        
        // Check for existing impersonation
        const impersonationInfo = localStorage.getItem('impersonation_info');
        if (impersonationInfo) {
          try {
            const info = JSON.parse(impersonationInfo);
            console.log('🎭 Found existing impersonation session:', info);
          } catch (e) {
            console.error('Invalid impersonation info:', e);
            localStorage.removeItem('impersonation_info');
          }
        }
        
        // Clear any existing session conflicts first
        const existingSession = localStorage.getItem('sb-nqvisvranvjaghvrdaaz-auth-token');
        if (existingSession) {
          // Found existing session token
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        // Retrieved session
        
        if (isMounted) {
          if (session?.user) {
            // Session user found, fetching profile
            setSession(session);
            try {
              const userProfile = await fetchUserProfile(session.user.id);
              if (userProfile) {
                setUser(userProfile);
                // Profile loaded successfully during init
                
                // Check if we should restore impersonation
                if (impersonationInfo && userProfile.membershipType === 'admin') {
                  try {
                    const info = JSON.parse(impersonationInfo);
                    if (info.originalAdminId === userProfile.id) {
                      console.log('🎭 Restoring impersonation session');
                      setOriginalAdminId(info.originalAdminId);
                      setIsImpersonating(true);
                      
                      // Fetch the impersonated user's profile
                      const targetUserProfile = await fetchUserProfile(info.targetUserId);
                      if (targetUserProfile) {
                        setUser(targetUserProfile);
                      } else {
                        // Target user no longer exists, clear impersonation
                        localStorage.removeItem('impersonation_info');
                        setIsImpersonating(false);
                        setOriginalAdminId(null);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to restore impersonation:', e);
                    localStorage.removeItem('impersonation_info');
                  }
                }
              } else {
                console.warn('⚠️ AUTH DEBUG: No profile found during init');
                // Keep session but set user to null for now
                setUser(null);
              }
            } catch (profileError) {
              console.error('❌ AUTH DEBUG: Profile fetch failed during init:', profileError);
              // Don't clear session on profile fetch failure
              // This prevents logout loops on page refresh
              setUser(null);
            }
          } else {
            // No session found
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          // Don't clear session on initialization errors
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // FIX 1: Remove async callbacks - Supabase best practice to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);
        
        // FIX 1: Use setTimeout to defer async operations (Supabase best practice)
        setTimeout(async () => {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔑 SIGNED_IN event - user ID:', session.user.id);
            console.log('🔍 AUTH DEBUG: About to call fetchUserProfile');
            setSession(session);
            
            // FIX 2: Add login tracking for ALL login methods (email/password AND Google OAuth)
            await updateLoginTracking(session.user.id);
            
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
              
              // Check email verification status (FIXED LOGIC - removed redundant null check)
              if (userProfile.verificationStatus === 'pending' && 
                  userProfile.membershipType !== 'admin') {
                console.log('📧 User needs email verification');
                setSession(null);
                setUser(null);
                setLoading(false);
                
                // Store user info for verification flow
                localStorage.setItem('pending_verification_email', userProfile.email);
                window.location.href = '/verify-email';
                return;
              }
              
              // Check manual approval status for business accounts
              // FIXED: Don't redirect pending users - let them access dashboard with limited features
              if (['retailer', 'manufacturer', 'organization'].includes(userProfile.membershipType) && 
                  userProfile.status === 'pending' && 
                  userProfile.verificationStatus !== 'pending') {
                console.log('⏳ Business account pending manual approval - allowing limited access');
                // Don't block access - set user and continue
                // The Dashboard component will handle showing limited features
              }
              
              // Check if user has completed their profile
              if (!userProfile.registrationCompleted) {
                console.log('📝 User needs to complete profile');
                setUser(userProfile);
                setLoading(false);
                
                // Redirect to complete profile page
                if (window.location.pathname !== '/complete-profile') {
                  window.location.href = '/complete-profile';
                }
                return;
              }
              
              // User is verified and approved - allow access
              console.log('✅ AUTH DEBUG: Setting user and completing login');
              setUser(userProfile);
              
              // Log the login activity with more details
              activityLogger.log({
                userId: userProfile.id,
                activityType: 'user_login',
                description: `User logged in: ${userProfile.email} (${userProfile.name || 'No name'})`,
                metadata: {
                  method: session.user.app_metadata?.provider || 'email',
                  email: userProfile.email,
                  name: userProfile.name,
                  membership_type: userProfile.membershipType,
                  subscription_plan: userProfile.subscriptionPlan,
                  ip_address: window.location.hostname
                }
              });
            } else {
              // No profile found for existing auth user - clean up orphaned session
              console.error('❌ Auth user exists but no profile found - cleaning up orphaned session');
              console.log('🧹 Signing out orphaned auth session...');
              await supabase.auth.signOut({ scope: 'global' });
              setSession(null);
              setUser(null);
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
            // Handle initial session load with better error handling
            console.log('🔄 INITIAL_SESSION event - handling page refresh...');
            if (session?.user) {
              console.log('🔍 INITIAL_SESSION: User found, fetching profile...');
              setSession(session);
              try {
                const userProfile = await fetchUserProfile(session.user.id);
                if (userProfile) {
                  setUser(userProfile);
                  console.log('✅ INITIAL_SESSION: Profile loaded successfully');
                } else {
                  console.warn('⚠️ INITIAL_SESSION: No profile found');
                  setUser(null);
                }
              } catch (profileError) {
                console.error('❌ INITIAL_SESSION: Profile fetch failed:', profileError);
                // Don't logout on profile fetch failure during refresh
                // Keep the session but set user to null
                setUser(null);
              }
            } else {
              console.log('🔍 INITIAL_SESSION: No user in session');
              setSession(null);
              setUser(null);
            }
          }
          
          setLoading(false);
        }, 0); // FIX 1: Defer async operations as recommended by Supabase docs
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
        
        // FIX 2: Login tracking now handled in onAuthStateChange for consistency
        // This ensures both email/password AND Google OAuth get tracking
        
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
      
      // Check for session conflicts or 406 errors
      if (error instanceof Error) {
        if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          console.log('🔄 Session conflict detected (406 error) - attempting recovery...');
          setSessionConflictDetected(true);
          
          // Force cleanup and retry
          try {
            await supabase.auth.signOut({ scope: 'global' });
            setSession(null);
            setUser(null);
            
            // Small delay before retry
            setTimeout(() => {
              console.log('🔄 Retrying login after session cleanup...');
              setSessionConflictDetected(false);
            }, 1000);
          } catch (cleanupError) {
            console.error('Failed to cleanup session conflict:', cleanupError);
          }
        }
      }
      
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
        // Regular email/password registration - use edge function to avoid timeouts
        console.log('🚀 Using edge function to register:', userData.email.trim());
        console.log('Full userData object:', userData);
        
        // Call our custom edge function instead of Supabase signUp
        console.log('Calling edge function with supabase client:', supabase);
        
        const { data, error: registerError } = await supabase.functions.invoke('register-user', {
          body: {
            email: userData.email.trim(),
            password: userData.password,
            userData: {
              name: userData.name,
              membershipType: userData.membershipType,
              location: userData.location,
              phone: userData.phone,
              companyName: userData.companyName
            },
            captchaToken: userData.captchaToken || 'test-token-for-development'
          }
        });
        
        console.log('📧 Edge function response:', { data, error: registerError });

        if (registerError) {
          console.error('Edge function error:', registerError);
          // Try to extract more details from the error
          if (registerError instanceof Error) {
            console.error('Error details:', {
              message: registerError.message,
              stack: registerError.stack,
              // Check if it's a FunctionsHttpError with response data
              response: (registerError as any).response,
              data: (registerError as any).data,
              status: (registerError as any).status
            });
          }
          throw registerError;
        }

        if (!data) {
          throw new Error('No response from registration service');
        }

        // Check if the edge function returned an error
        if (data.error) {
          console.error('Registration error from edge function:', data.error);
          throw new Error(data.error);
        }

        if (!data.success || !data.user) {
          throw new Error('User creation failed');
        }
        
        // Edge function returns user data differently
        authData = { user: data.user };
      }

      // For Google OAuth users, we still need to create the profile
      if (googleUserData && userData.isGoogleOAuth) {
        // Determine proper status based on membership type and registration method
        let initialStatus = 'active';
        let verificationStatus = 'pending';
        
        // Business accounts need manual approval after email verification
        if (['retailer', 'manufacturer', 'organization'].includes(userData.membershipType)) {
          initialStatus = 'pending'; // Will be pending until manual approval
          verificationStatus = 'pending'; // Must verify email first
        }
        
        console.log('🔐 Google OAuth user requires email verification');

        // Create user profile with basic data only
        console.log('📝 Creating user profile for Google OAuth user:', userData.email, 'with membership type:', userData.membershipType);
        
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: userData.email.trim(),
            membership_type: userData.membershipType,
            phone: userData.phone || null,
            company_name: userData.companyName || null,
            status: initialStatus,
            verification_status: verificationStatus,
            // Add more fields to avoid issues
            name: userData.name || null,
            first_name: userData.name ? userData.name.split(' ')[0] : null,
            last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : null,
            location: userData.location || null
          }]);

        if (profileError) {
          console.error('❌ Profile creation failed:', profileError);
          console.error('Profile error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          
          // If profile creation fails, we need to clean up the auth user
          try {
            await supabase.auth.signOut();
          } catch (cleanupError) {
            console.error('Failed to cleanup auth session after profile error:', cleanupError);
          }
          
          // Provide more specific error messages
          if (profileError.code === '42501') {
            throw new Error('Registration is temporarily unavailable. Please try again in a few moments.');
          } else if (profileError.message?.includes('duplicate key')) {
            throw new Error('An account with this email already exists. Please try logging in instead.');
          } else {
            throw new Error(`Registration failed: ${profileError.message || 'Unable to create user profile'}`);
          }
        }
      } else {
        // For regular registration, the edge function already created the profile
        console.log('✅ Edge function already created user profile');
      }
      
      console.log('✅ Registration successful for:', userData.email);

      // Clean up Google OAuth data if this was a Google registration
      if (googleUserData && userData.isGoogleOAuth) {
        localStorage.removeItem('google_oauth_user');
        console.log('🧹 Cleaned up Google OAuth registration data');
      }

      // Supabase Auth automatically sends verification email on signup
      // No need to manually queue or resend emails - this was causing the 504 timeout
      // The built-in auth system handles email delivery, retries, and confirmation
      
      console.log('📧 Verification email will be sent automatically by Supabase Auth');
      
      // For business accounts that need approval, we'll handle the welcome email
      // after they verify their email and get approved
      if (['retailer', 'manufacturer', 'organization'].includes(userData.membershipType)) {
        console.log('📋 Business account registered - pending email verification and approval');
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
      
      // If impersonating, stop impersonation instead of logging out
      if (isImpersonating) {
        await stopImpersonation();
        setLoading(false);
        return;
      }
      
      // Log the logout activity before clearing user
      if (user) {
        activityLogger.log({
          userId: user.id,
          activityType: 'user_logout',
          description: `User logged out: ${user.email} (${user.name || 'No name'})`,
          metadata: {
            email: user.email,
            name: user.name,
            membership_type: user.membershipType
          }
        });
      }
      
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
      
      console.log('✅ Auth data cleared by Supabase');
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
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Signout warning:', error);
    }
    
    setSession(null);
    setUser(null);
    console.log('✅ Force cleanup completed');
    window.location.reload();
  };

  // Validate current session is still valid
  const validateSession = async (): Promise<boolean> => {
    try {
      if (!session) return false;
      
      // Check if session is expired
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      
      if (expiresAt && now > expiresAt) {
        console.log('Session expired, clearing auth state');
        setSession(null);
        setUser(null);
        return false;
      }
      
      // Verify session with backend
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('Session validation failed - no user');
        setSession(null);
        setUser(null);
        return false;
      }
      
      // Update sessionValidatedAt timestamp
      if (user) {
        setUser({
          ...user,
          sessionValidatedAt: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  // Get user permissions with caching
  const getUserPermissions = async (): Promise<string[]> => {
    if (!user) return [];
    
    // Check cache first
    const cacheKey = `${user.id}-${user.membershipType}`;
    const cached = permissionsCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      console.log('Returning cached permissions');
      return cached.permissions;
    }
    
    try {
      // Define permissions based on membership type
      let permissions: string[] = [];
      
      switch (user.membershipType) {
        case 'admin':
          permissions = [
            'competition_results.create',
            'competition_results.read',
            'competition_results.update',
            'competition_results.delete',
            'competition_results.verify',
            'competition_results.bulk_update',
            'users.read',
            'users.update',
            'users.delete',
            'events.create',
            'events.update',
            'events.delete'
          ];
          break;
          
        case 'organization':
        case 'manufacturer':
        case 'retailer':
          permissions = [
            'competition_results.create',
            'competition_results.read',
            'competition_results.update_own',
            'competition_results.delete_own',
            'events.create',
            'events.update_own'
          ];
          break;
          
        case 'pro_competitor':
          permissions = [
            'competition_results.create',
            'competition_results.read',
            'competition_results.update_own',
            'competition_results.delete_own',
            'competition_results.export'
          ];
          break;
          
        case 'competitor':
        default:
          permissions = [
            'competition_results.create',
            'competition_results.read',
            'competition_results.update_own_limited',
            'competition_results.delete_own_limited'
          ];
          break;
      }
      
      // Check for any custom role permissions from database
      if (user.role) {
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('permissions')
            .eq('role_name', user.role)
            .single();
            
          if (roleData?.permissions) {
            permissions = [...new Set([...permissions, ...roleData.permissions])];
          }
        } catch (error) {
          console.warn('Failed to load custom role permissions:', error);
        }
      }
      
      // Cache the permissions for 5 minutes
      const expiry = Date.now() + (5 * 60 * 1000);
      permissionsCache.set(cacheKey, { permissions, expiry });
      
      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  };

  // Clear permissions cache
  const clearPermissionsCache = () => {
    permissionsCache.clear();
    console.log('Permissions cache cleared');
  };

  // Impersonate user function (admin only)
  const impersonateUser = async (targetUserId: string) => {
    try {
      if (!user || user.membershipType !== 'admin') {
        throw new Error('Only admins can impersonate users');
      }

      console.log('🎭 Starting impersonation:', targetUserId);
      
      // Store the original admin ID
      setOriginalAdminId(user.id);
      
      // Log the impersonation activity
      await activityLogger.log({
        userId: user.id,
        activityType: 'impersonation_start',
        description: `Admin ${user.email} started impersonating user ${targetUserId}`,
        metadata: {
          admin_id: user.id,
          admin_email: user.email,
          target_user_id: targetUserId,
          started_at: new Date().toISOString()
        }
      });

      // Fetch the target user's profile
      const targetUserProfile = await fetchUserProfile(targetUserId);
      
      if (!targetUserProfile) {
        throw new Error('Target user not found');
      }

      // Set the impersonation state
      setIsImpersonating(true);
      setUser(targetUserProfile);
      
      // Store impersonation info in localStorage for persistence
      localStorage.setItem('impersonation_info', JSON.stringify({
        originalAdminId: user.id,
        targetUserId: targetUserId,
        startedAt: new Date().toISOString()
      }));

      console.log('✅ Impersonation started successfully');
    } catch (error) {
      console.error('❌ Impersonation failed:', error);
      throw error;
    }
  };

  // Stop impersonation and return to admin account
  const stopImpersonation = async () => {
    try {
      if (!isImpersonating || !originalAdminId) {
        console.log('Not currently impersonating');
        return;
      }

      console.log('🎭 Stopping impersonation');
      
      // Log the end of impersonation
      if (user) {
        await activityLogger.log({
          userId: originalAdminId,
          activityType: 'impersonation_end',
          description: `Admin stopped impersonating user ${user.id}`,
          metadata: {
            admin_id: originalAdminId,
            target_user_id: user.id,
            ended_at: new Date().toISOString()
          }
        });
      }

      // Restore the admin profile
      const adminProfile = await fetchUserProfile(originalAdminId);
      
      if (adminProfile) {
        setUser(adminProfile);
      }

      // Clear impersonation state
      setIsImpersonating(false);
      setOriginalAdminId(null);
      localStorage.removeItem('impersonation_info');

      console.log('✅ Returned to admin account');
    } catch (error) {
      console.error('❌ Failed to stop impersonation:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isImpersonating,
    originalAdminId,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    updatePassword,
    refreshUser,
    resendVerificationEmail,
    forceCleanupOrphanedSession,
    validateSession,
    getUserPermissions,
    clearPermissionsCache,
    impersonateUser,
    stopImpersonation
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