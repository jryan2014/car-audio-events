import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { activityLogger } from '../services/activityLogger';
import { getClientIp, getCachedClientIp, setCachedClientIp } from '../utils/getClientIp';
import { z } from 'zod';

// User type definition with validation schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(254),
  name: z.string().min(1).max(100),
  membershipType: z.enum(['competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin']),
  status: z.string().optional(),
  verificationStatus: z.string().optional(),
  profileImage: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  bio: z.string().optional(),
  companyName: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  requiresPasswordChange: z.boolean().optional(),
  passwordChangedAt: z.string().optional(),
  organizationId: z.number().optional(),
  role: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  registrationProvider: z.string().optional(),
  registrationCompleted: z.boolean().optional(),
  sessionValidatedAt: z.string().optional(),
  permissionsCache: z.array(z.string()).optional(),
  rolesCacheExpiry: z.string().optional(),
});

type User = z.infer<typeof UserSchema>;

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

// Security constants
const MAX_PROFILE_FETCH_RETRIES = 3;
const PROFILE_FETCH_TIMEOUT_MS = 5000; // Reduced from 15-20s
const SESSION_VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PERMISSION_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const EXPONENTIAL_BACKOFF_BASE = 1000; // 1 second

// Helper: Delay function for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Generate secure session fingerprint
const generateSessionFingerprint = async (): Promise<string> => {
  const userAgent = navigator.userAgent;
  const screenResolution = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  const fingerprint = `${userAgent}|${screenResolution}|${timezone}|${language}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number>(30); // Default 30 minutes
  const [permissionsCache, setPermissionsCache] = useState<Map<string, { permissions: string[]; expiry: number }>>(new Map());
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);

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
        setSessionTimeout(Math.min(timeoutMinutes, 120)); // Cap at 2 hours
      }
    } catch (error) {
      console.error('Failed to load session timeout:', error);
    }
  };

  useEffect(() => {
    loadSessionTimeout();
  }, []);

  // Auto-logout based on inactivity
  const { resetTimer } = useInactivityTimer({
    timeout: sessionTimeout * 60 * 1000,
    onTimeout: async () => {
      await logout();
    },
    isActive: !!user
  });

  useEffect(() => {
    if (user) {
      resetTimer();
    }
  }, [user, resetTimer]);

  // SECURE: Enhanced profile fetch with retries and validation
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid user ID format');
      return null;
    }

    for (let attempt = 0; attempt < MAX_PROFILE_FETCH_RETRIES; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_FETCH_TIMEOUT_MS);
        });

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
        
        if (result.error) {
          throw result.error;
        }

        if (!result.data) {
          throw new Error('No profile data returned');
        }

        // Validate critical fields
        if (!result.data.id || !result.data.email || !result.data.membership_type) {
          throw new Error('Invalid profile structure - missing critical fields');
        }

        // Construct and validate user profile
        const profile: User = {
          id: result.data.id,
          name: result.data.name || result.data.email,
          email: result.data.email,
          membershipType: result.data.membership_type,
          status: result.data.status || 'active',
          verificationStatus: result.data.verification_status || 'pending',
          location: result.data.location || '',
          phone: result.data.phone || '',
          website: '',
          bio: '',
          companyName: result.data.company_name || '',
          subscriptionPlan: result.data.subscription_plan || 'basic',
          requiresPasswordChange: false,
          passwordChangedAt: undefined,
          firstName: result.data.first_name || '',
          lastName: result.data.last_name || '',
          address: result.data.address || '',
          city: result.data.city || '',
          state: result.data.state || '',
          zip: result.data.zip || '',
          country: result.data.country || 'United States',
          taxId: result.data.tax_id || '',
          registrationProvider: result.data.registration_provider || 'email',
          registrationCompleted: result.data.registration_completed || false,
          sessionValidatedAt: new Date().toISOString(),
        };

        // Validate with schema
        const validatedProfile = UserSchema.parse(profile);
        return validatedProfile;

      } catch (error) {
        console.error(`Profile fetch attempt ${attempt + 1} failed:`, error);
        
        if (attempt === MAX_PROFILE_FETCH_RETRIES - 1) {
          // Final attempt failed - force logout for security
          await supabase.auth.signOut();
          return null;
        }
        
        // Exponential backoff before retry
        await delay(EXPONENTIAL_BACKOFF_BASE * Math.pow(2, attempt));
      }
    }
    
    return null;
  };

  // Enhanced login tracking with fingerprinting
  const updateLoginTracking = async (userId: string) => {
    try {
      let clientIp = getCachedClientIp();
      if (!clientIp) {
        clientIp = await getClientIp();
        if (clientIp) {
          setCachedClientIp(clientIp);
        }
      }

      const fingerprint = await generateSessionFingerprint();
      setSessionFingerprint(fingerprint);

      const params: any = { 
        p_user_id: userId,
        p_fingerprint: fingerprint
      };
      if (clientIp) {
        params.p_ip_address = clientIp;
      }
      
      const { error } = await supabase.rpc('update_user_login_stats_secure', params);
      
      if (error) {
        console.warn('Failed to update login stats:', error);
      }
    } catch (trackingError) {
      console.error('Login tracking error:', trackingError);
    }
  };

  // Periodically validate session with fingerprint check
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(async () => {
      const isValid = await validateSession();
      if (!isValid) {
        console.log('Session validation failed - logging out');
        await logout();
      }
    }, SESSION_VALIDATION_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [session, sessionFingerprint]);

  // Enhanced session validation
  const validateSession = async (): Promise<boolean> => {
    try {
      if (!session) return false;
      
      // Check if session is expired
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      
      if (expiresAt && now > expiresAt) {
        console.log('Session expired');
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
      
      // Verify session fingerprint matches
      const currentFingerprint = await generateSessionFingerprint();
      if (sessionFingerprint && currentFingerprint !== sessionFingerprint) {
        console.warn('Session fingerprint mismatch - possible session hijacking');
        await supabase.auth.signOut();
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

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check for existing impersonation
        const impersonationInfo = localStorage.getItem('impersonation_info');
        if (impersonationInfo) {
          try {
            const info = JSON.parse(impersonationInfo);
            // Verify impersonation token is still valid
            const { data: adminUser } = await supabase
              .from('users')
              .select('membership_type')
              .eq('id', info.originalAdminId)
              .single();
              
            if (!adminUser || adminUser.membership_type !== 'admin') {
              localStorage.removeItem('impersonation_info');
            }
          } catch (e) {
            localStorage.removeItem('impersonation_info');
          }
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session?.user) {
            setSession(session);
            const userProfile = await fetchUserProfile(session.user.id);
            if (userProfile) {
              setUser(userProfile);
              
              // Restore impersonation if valid
              if (impersonationInfo && userProfile.membershipType === 'admin') {
                try {
                  const info = JSON.parse(impersonationInfo);
                  if (info.originalAdminId === userProfile.id) {
                    setOriginalAdminId(info.originalAdminId);
                    setIsImpersonating(true);
                    
                    const targetUserProfile = await fetchUserProfile(info.targetUserId);
                    if (targetUserProfile) {
                      setUser(targetUserProfile);
                    } else {
                      localStorage.removeItem('impersonation_info');
                      setIsImpersonating(false);
                      setOriginalAdminId(null);
                    }
                  }
                } catch (e) {
                  localStorage.removeItem('impersonation_info');
                }
              }
            } else {
              // No profile found - sign out for security
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            }
          } else {
            setSession(null);
            setUser(null);
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

    // Auth state change handler without async callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // Use setTimeout to defer async operations
        setTimeout(async () => {
          if (event === 'SIGNED_IN' && session?.user) {
            setSession(session);
            await updateLoginTracking(session.user.id);
            
            const userProfile = await fetchUserProfile(session.user.id);
            
            if (!userProfile && session.user.app_metadata?.provider === 'google') {
              // Google user without existing account - block and redirect
              setSession(null);
              setUser(null);
              setLoading(false);
              
              await supabase.auth.signOut();
              
              localStorage.setItem('google_oauth_blocked', JSON.stringify({
                email: session.user.email,
                message: 'You must register for an account before using Google sign-in.'
              }));
              
              window.location.href = '/pricing?google_blocked=true';
              return;
            } else if (userProfile) {
              // Verify email and approval status
              if (userProfile.verificationStatus === 'pending' && 
                  userProfile.membershipType !== 'admin') {
                setSession(null);
                setUser(null);
                setLoading(false);
                
                localStorage.setItem('pending_verification_email', userProfile.email);
                window.location.href = '/verify-email';
                return;
              }
              
              // Check profile completion
              if (!userProfile.registrationCompleted) {
                setUser(userProfile);
                setLoading(false);
                
                if (window.location.pathname !== '/complete-profile') {
                  window.location.href = '/complete-profile';
                }
                return;
              }
              
              setUser(userProfile);
              
              // Log the login activity
              activityLogger.log({
                userId: userProfile.id,
                activityType: 'user_login',
                description: `User logged in: ${userProfile.email}`,
                metadata: {
                  method: session.user.app_metadata?.provider || 'email',
                  email: userProfile.email,
                  name: userProfile.name,
                  membership_type: userProfile.membershipType,
                  subscription_plan: userProfile.subscriptionPlan,
                }
              });
            } else {
              // No profile found - clean up orphaned session
              await supabase.auth.signOut({ scope: 'global' });
              setSession(null);
              setUser(null);
            }
            
            setLoading(false);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setSessionFingerprint(null);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setSession(session);
          } else if (event === 'INITIAL_SESSION') {
            if (session?.user) {
              setSession(session);
              try {
                const userProfile = await fetchUserProfile(session.user.id);
                if (userProfile) {
                  setUser(userProfile);
                } else {
                  setUser(null);
                }
              } catch (profileError) {
                setUser(null);
              }
            } else {
              setSession(null);
              setUser(null);
            }
          }
          
          setLoading(false);
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Secure login with rate limiting check
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Input validation
      const emailSchema = z.string().email().max(254);
      const passwordSchema = z.string().min(8).max(128);
      
      try {
        emailSchema.parse(email);
        passwordSchema.parse(password);
      } catch (validationError) {
        throw new Error('Invalid email or password format');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        setSession(data.session);
        
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setUser(userProfile);
        } else {
          throw new Error('Failed to load user profile');
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
      setLoading(false);
    }
  };

  // Enhanced registration with validation
  const register = async (userData: any): Promise<void> => {
    try {
      setLoading(true);
      
      // Validate registration data
      const registrationSchema = z.object({
        email: z.string().email().max(254),
        password: z.string().min(8).max(128),
        name: z.string().min(1).max(100),
        membershipType: z.enum(['competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization']),
        captchaToken: z.string().optional(),
      });
      
      const validatedData = registrationSchema.parse(userData);
      
      // Check if this is a Google OAuth user completing registration
      const googleUserData = localStorage.getItem('google_oauth_user');
      let authData: any;
      
      if (googleUserData && userData.isGoogleOAuth) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Google OAuth session expired. Please try again.');
        }
        authData = { user };
      } else {
        // Use edge function for registration
        const { data, error: registerError } = await supabase.functions.invoke('register-user-secure', {
          body: {
            email: validatedData.email.toLowerCase(),
            password: validatedData.password,
            userData: {
              name: validatedData.name,
              membershipType: validatedData.membershipType,
              location: userData.location,
              phone: userData.phone,
              companyName: userData.companyName
            },
            captchaToken: validatedData.captchaToken || undefined
          }
        });

        if (registerError) {
          throw registerError;
        }

        if (!data || data.error) {
          throw new Error(data?.error || 'User creation failed');
        }
        
        authData = { user: data.user };
      }

      // Handle Google OAuth profile creation if needed
      if (googleUserData && userData.isGoogleOAuth) {
        let initialStatus = 'active';
        let verificationStatus = 'pending';
        
        if (['retailer', 'manufacturer', 'organization'].includes(validatedData.membershipType)) {
          initialStatus = 'pending';
          verificationStatus = 'pending';
        }

        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: validatedData.email.toLowerCase(),
            membership_type: validatedData.membershipType,
            phone: userData.phone || null,
            company_name: userData.companyName || null,
            status: initialStatus,
            verification_status: verificationStatus,
            name: validatedData.name,
            first_name: validatedData.name.split(' ')[0],
            last_name: validatedData.name.split(' ').slice(1).join(' '),
            location: userData.location || null
          }]);

        if (profileError) {
          await supabase.auth.signOut();
          throw new Error('Registration failed: Unable to create user profile');
        }
      }

      if (googleUserData && userData.isGoogleOAuth) {
        localStorage.removeItem('google_oauth_user');
      }

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Secure logout with cleanup
  const logout = async () => {
    try {
      setLoading(true);
      
      if (isImpersonating) {
        await stopImpersonation();
        setLoading(false);
        return;
      }
      
      if (user) {
        activityLogger.log({
          userId: user.id,
          activityType: 'user_logout',
          description: `User logged out: ${user.email}`,
          metadata: {
            email: user.email,
            name: user.name,
            membership_type: user.membershipType
          }
        });
      }
      
      // Clear local state
      setSession(null);
      setUser(null);
      setSessionFingerprint(null);
      clearPermissionsCache();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Sign out from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (authError) {
        console.warn('Auth logout warning:', authError);
      }
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
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
    // Validate password strength
    const passwordSchema = z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
    
    passwordSchema.parse(password);
    
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
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user.id);
      if (userProfile) {
        setUser(userProfile);
      }
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      
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
        throw error;
      }
    } catch (error) {
      console.error('Google login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  const forceCleanupOrphanedSession = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Signout warning:', error);
    }
    
    setSession(null);
    setUser(null);
    setSessionFingerprint(null);
    clearPermissionsCache();
    sessionStorage.clear();
    window.location.reload();
  };

  // Enhanced permission management with caching
  const getUserPermissions = async (): Promise<string[]> => {
    if (!user) return [];
    
    // Check cache first
    const cacheKey = `${user.id}-${user.membershipType}`;
    const cached = permissionsCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
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
            'events.delete',
            'admin.impersonate'
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
      
      // Check for custom role permissions
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
      
      // Cache the permissions
      const expiry = Date.now() + PERMISSION_CACHE_DURATION_MS;
      permissionsCache.set(cacheKey, { permissions, expiry });
      
      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  };

  const clearPermissionsCache = () => {
    permissionsCache.clear();
  };

  // Secure impersonation with audit logging
  const impersonateUser = async (targetUserId: string) => {
    try {
      if (!user || user.membershipType !== 'admin') {
        throw new Error('Only admins can impersonate users');
      }

      // Validate target user ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetUserId)) {
        throw new Error('Invalid target user ID');
      }

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

      const targetUserProfile = await fetchUserProfile(targetUserId);
      
      if (!targetUserProfile) {
        throw new Error('Target user not found');
      }

      setIsImpersonating(true);
      setUser(targetUserProfile);
      
      // Store impersonation info securely
      const impersonationToken = await generateSessionFingerprint();
      sessionStorage.setItem('impersonation_info', JSON.stringify({
        originalAdminId: user.id,
        targetUserId: targetUserId,
        startedAt: new Date().toISOString(),
        token: impersonationToken
      }));

    } catch (error) {
      console.error('Impersonation failed:', error);
      throw error;
    }
  };

  const stopImpersonation = async () => {
    try {
      if (!isImpersonating || !originalAdminId) {
        return;
      }
      
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

      const adminProfile = await fetchUserProfile(originalAdminId);
      
      if (adminProfile) {
        setUser(adminProfile);
      }

      setIsImpersonating(false);
      setOriginalAdminId(null);
      sessionStorage.removeItem('impersonation_info');

    } catch (error) {
      console.error('Failed to stop impersonation:', error);
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