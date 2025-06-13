import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { emailService } from '../services/emailService';

interface User {
  id: string;
  name: string;
  email: string;
  membershipType: 'competitor' | 'manufacturer' | 'retailer' | 'organization' | 'admin';
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.warn('Session error (this is normal on first visit):', error.message);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.email);
      
      setSession(session);
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Fetching profile for user:', authUser.email);
      
      // Special handling for admin user
      if (authUser.email === 'admin@caraudioevents.com') {
        console.log('Admin user detected, setting admin profile directly');
        
        setUser({
          id: authUser.id,
          name: 'System Administrator',
          email: authUser.email || '',
          membershipType: 'admin',
          status: 'active',
          verificationStatus: 'verified',
          subscriptionPlan: 'enterprise',
          requiresPasswordChange: false
        });
        setLoading(false);
        return;
      }
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        
        // If profile doesn't exist, create a basic one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating basic profile');
          await createUserProfile(authUser);
          return;
        } else {
          // Set a minimal user object for other users
          setUser({
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            membershipType: 'competitor',
          });
        }
        setLoading(false);
        return;
      }

      if (profile) {
        setUserFromProfile(profile);
      }
    } catch (error) {
      console.warn('Error in fetchUserProfile:', error);
      
      // Set a minimal user object as fallback
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        membershipType: authUser.email === 'admin@caraudioevents.com' ? 'admin' : 'competitor',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Creating basic profile for user:', authUser.email);
      
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          membership_type: authUser.email === 'admin@caraudioevents.com' ? 'admin' : 'competitor',
          status: 'active',
        }, { onConflict: 'id' });

      if (upsertError) {
        console.warn('Error creating/updating profile:', upsertError.message);
      }

      // Set user object directly instead of refetching
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        membershipType: authUser.email === 'admin@caraudioevents.com' ? 'admin' : 'competitor',
      });
    } catch (error) {
      console.warn('Error creating user profile:', error);
      // Set a minimal user object as final fallback
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        membershipType: authUser.email === 'admin@caraudioevents.com' ? 'admin' : 'competitor',
      });
    } finally {
      setLoading(false);
    }
  };

  const setUserFromProfile = (profile: any) => {
    const userProfile: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      membershipType: profile.membership_type,
      profileImage: profile.profile_image_url,
      status: profile.status,
      location: profile.location,
      phone: profile.phone,
      website: profile.website,
      bio: profile.bio,
      companyName: profile.company_name,
      verificationStatus: profile.verification_status,
      subscriptionPlan: profile.subscription_plan,
      requiresPasswordChange: profile.password_changed_at ? false : true,
      passwordChangedAt: profile.password_changed_at,
    };
    
    console.log('Setting user profile:', userProfile);
    setUser(userProfile);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login failed:', error.message);
        throw error;
      }

      console.log('Login successful for:', email);
      // User profile will be fetched automatically by the auth state change listener
      // Don't navigate here - let the login page handle navigation
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Clear any remaining session data
      localStorage.clear();
    }
    if (error) {
      throw error;
    }
    // State will be cleared automatically by the auth state change listener
  };

  const register = async (userData: any) => {
    console.log('🚀 Starting registration process...');
    
    try {
      // Step 1: Create the auth user
      console.log('🔐 Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
        }
      });

      if (authError) {
        console.error('❌ Auth user creation failed:', authError);
        throw authError;
      }

      if (!authData.user) {
        console.error('❌ No user returned from auth signup');
        throw new Error('Registration failed - no user returned');
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Step 2: Create the user profile
      console.log('👤 Creating user profile...');
      
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          membership_type: userData.membershipType,
          location: userData.location,
          status: 'pending',
          verification_status: 'pending',
          subscription_plan: 'free',
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError);
        throw profileError;
      }
      
      console.log('✅ User profile created successfully');

      // Step 3: Send welcome email
      console.log('📧 Sending welcome email...');
      try {
        const emailResult = await emailService.sendTemplatedEmail(
          userData.email,
          'welcome',
          {
            firstName: userData.name.split(' ')[0] || userData.name,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        );

        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully');
        } else {
          console.warn('⚠️ Welcome email failed to send:', emailResult.error);
          // Don't fail registration if email fails
        }
      } catch (emailError) {
        console.warn('⚠️ Welcome email error:', emailError);
        // Don't fail registration if email fails
      }
      
      console.log('🎉 Registration completed successfully!');
      
    } catch (error) {
      console.error('💥 Registration failed:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    // Update the user profile to mark password as changed
    if (user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating password change status:', updateError);
      }

      // Refresh user profile
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      logout,
      register,
      updatePassword,
      isAuthenticated: !!user,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}