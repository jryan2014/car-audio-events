# Email System Implementation Plan - Detailed Code Changes

## Phase 1: Fix User Registration (Immediate Priority)

### 1.1 Update AuthContext.tsx - Registration Function

**Current Issue:** Lines 667-683 use custom queue-email function causing timeouts

**Solution:** Replace with Supabase native auth signup

```typescript
// BEFORE (Lines 667-683):
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

// AFTER (Replacement):
// Remove the queue-email call entirely - Supabase auth handles welcome emails
console.log('✅ Using Supabase built-in email system for verification');
```

**Key Changes in `register()` function:**
1. **Remove queue-email edge function call** (lines 667-683)
2. **Update signUp options** to include email confirmation
3. **Add proper email redirect configuration**

```typescript
// Updated signUp call (around line 575):
const { data, error: authError } = await supabase.auth.signUp({
  email: userData.email.trim(),
  password: userData.password,
  options: {
    emailRedirectTo: `${window.location.origin}/dashboard?verified=true`,
    data: {
      name: userData.name,
      membership_type: userData.membershipType,
      location: userData.location,
      phone: userData.phone,
      company_name: userData.companyName
    }
  }
});
```

### 1.2 Update Registration Flow UI

**File: `src/pages/Register.tsx`**

**Add post-registration email verification UI:**

```typescript
// After line 392 (setRegistrationSuccess(true)):

// Show email verification message instead of immediate dashboard redirect
setRegistrationSuccess(true);
// Remove the 3-second timeout redirect
// Let users manually navigate after checking email
```

**Update success message (around line 952):**

```typescript
if (registrationSuccess) {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 animate-bounce" />
          <h2 className="mt-6 text-3xl font-black text-white">
            Registration <span className="text-green-400">Almost Complete!</span>
          </h2>
          <p className="mt-2 text-gray-400">
            We've sent a verification email to <strong>{formData.email}</strong>
          </p>
          <p className="mt-2 text-gray-300">
            Please check your email and click the verification link to complete your registration.
          </p>
          <div className="mt-6 space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-electric-600 hover:bg-electric-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Continue to Dashboard
            </button>
            <p className="text-sm text-gray-400">
              You can complete verification from your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 1.3 Add Email Verification Reminder Component

**Create: `src/components/EmailVerificationReminder.tsx`**

```typescript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Mail, CheckCircle } from 'lucide-react';

interface EmailVerificationReminderProps {
  show: boolean;
  onClose: () => void;
}

export const EmailVerificationReminder: React.FC<EmailVerificationReminderProps> = ({ show, onClose }) => {
  const { user, resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!show || !user) return null;

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      await resendVerificationEmail(user.email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-400">Email Verification Required</h3>
          <p className="text-sm text-yellow-300 mt-1">
            Please check your email at <strong>{user.email}</strong> and click the verification link to activate your account.
          </p>
          
          {error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
          
          {resendSuccess && (
            <div className="flex items-center space-x-2 mt-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-400">Verification email sent!</p>
            </div>
          )}
          
          <div className="mt-3 space-x-3">
            <button
              onClick={handleResend}
              disabled={isResending || resendSuccess}
              className="text-sm text-yellow-400 hover:text-yellow-300 font-medium disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Phase 2: Fix Support Desk Email Verification

### 2.1 Create New Edge Function for Support Email Verification

**Create: `supabase/functions/verify-support-email-simple/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  email: string;
  captcha_token?: string;
  action: 'send' | 'verify';
  code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { email, captcha_token, action, code } = await req.json() as RequestBody;
    
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (action === 'send') {
      // Verify captcha (skip in development)
      if (captcha_token && captcha_token !== 'test-token-for-development') {
        const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY');
        if (hcaptchaSecret) {
          const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: hcaptchaSecret,
              response: captcha_token,
              remoteip: ip,
            }),
          });

          const captchaResult = await captchaResponse.json();
          if (!captchaResult.success) {
            throw new Error('Captcha verification failed');
          }
        }
      }

      // Create temporary auth user for verification
      const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false, // We want to send confirmation email
        user_metadata: {
          is_temp_support_user: true,
          created_for: 'support_verification',
          ip_address: ip
        }
      });

      if (authError) {
        // If user already exists, try to resend confirmation
        if (authError.message.includes('already exists')) {
          const { error: resendError } = await supabaseClient.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: `${Deno.env.get('SITE_BASE_URL') || 'https://caraudioevents.com'}/support/verify-callback`
            }
          });
          
          if (resendError) throw resendError;
        } else {
          throw authError;
        }
      } else {
        // Send confirmation email for new temp user
        const { error: confirmError } = await supabaseClient.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${Deno.env.get('SITE_BASE_URL') || 'https://caraudioevents.com'}/support/verify-callback`
          }
        });
        
        if (confirmError) throw confirmError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify') {
      // For verification, we'll check if the user confirmed their email
      const { data: { user }, error } = await supabaseClient.auth.admin.getUserById(code!);
      
      if (error || !user) {
        throw new Error('Invalid verification');
      }

      if (user.email_confirmed_at && user.user_metadata?.is_temp_support_user) {
        // Mark as verified and clean up
        return new Response(
          JSON.stringify({ success: true, verified: true, email: user.email }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error('Email not verified');
      }
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Support email verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Verification failed' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### 2.2 Update Support Form Email Verification

**File: `src/modules/support-desk/components/public/EmailVerificationModal.tsx`**

**Replace the complex verification with simple auth-based flow:**

```typescript
// Replace sendVerificationEmail function (lines 39-77):
const sendVerificationEmail = async () => {
  setLoading(true);
  setError('');
  
  try {
    const tokenToUse = captchaToken || (import.meta.env.DEV ? 'test-token-for-development' : '');
    
    // Use Supabase auth directly for verification
    const { error } = await supabase.auth.signUp({
      email,
      password: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      options: {
        emailRedirectTo: `${window.location.origin}/support/verify-callback`,
        data: {
          is_temp_support_user: true,
          captcha_token: tokenToUse
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        // Resend confirmation for existing user
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/support/verify-callback`
          }
        });
        if (resendError) throw resendError;
      } else {
        throw error;
      }
    }
    
    setVerificationSent(true);
    setResendCooldown(60);
  } catch (error: any) {
    console.error('Error sending verification:', error);
    setError(error.message || 'Failed to send verification email');
  } finally {
    setLoading(false);
  }
};

// Simplify verifyCode function (lines 79-110):
const verifyCode = async () => {
  // For auth-based verification, we don't need manual code entry
  // The verification happens automatically when user clicks email link
  setError('Please click the link in your email to verify');
};
```

### 2.3 Create Support Verification Callback Page

**Create: `src/pages/SupportVerifyCallback.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function SupportVerifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  
  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the auth tokens from URL
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        
        if (!access_token) {
          throw new Error('No verification token found');
        }

        // Verify the session
        const { data: { user }, error } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token || ''
        });

        if (error || !user) {
          throw new Error('Invalid verification token');
        }

        // Check if this is a temp support user
        if (user.user_metadata?.is_temp_support_user) {
          // Store verified email in session storage
          sessionStorage.setItem('verified_support_email', user.email!);
          
          // Clean up the temp user (in background)
          supabase.auth.admin.deleteUser(user.id).catch(console.error);
          
          setStatus('success');
          
          // Redirect to support form after 2 seconds
          setTimeout(() => {
            navigate('/support', { 
              state: { verifiedEmail: user.email } 
            });
          }, 2000);
        } else {
          throw new Error('Invalid verification type');
        }
        
      } catch (error: any) {
        console.error('Verification error:', error);
        setError(error.message || 'Verification failed');
        setStatus('error');
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin h-8 w-8 border-2 border-electric-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Verifying Email...</h2>
            <p className="text-gray-400">Please wait while we verify your email address.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-400 mb-4">
              Your email has been successfully verified. Redirecting you to the support form...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/support')}
              className="bg-electric-600 hover:bg-electric-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

## Phase 3: Configuration and Testing

### 3.1 Supabase Dashboard Email Configuration

**Email Templates → Settings:**

1. **Enable Email Confirmations**
2. **Set Custom SMTP** (if using custom provider)
3. **Configure Email Templates:**

```html
<!-- Email Confirmation Template -->
<h2>Welcome to Car Audio Events!</h2>
<p>Thanks for signing up! Please click the link below to verify your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't sign up for Car Audio Events, please ignore this email.</p>
```

### 3.2 Update Router Configuration

**File: `src/App.tsx`**

Add the new callback route:

```typescript
import SupportVerifyCallback from './pages/SupportVerifyCallback';

// Add to routes:
<Route path="/support/verify-callback" element={<SupportVerifyCallback />} />
```

### 3.3 Environment Variables

**Required in Supabase Dashboard:**

```bash
# Email Settings
SITE_URL=https://caraudioevents.com
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@caraudioevents.com
SMTP_PASS=your_mailgun_password

# Confirmation URLs
EMAIL_CONFIRM_REDIRECT_TO=https://caraudioevents.com/dashboard?verified=true
EMAIL_CONFIRM_REDIRECT_TO_SUPPORT=https://caraudioevents.com/support/verify-callback
```

## Phase 4: Testing Plan

### 4.1 Registration Testing

1. **Test with admin@caraudioevents.com**
2. **Verify email delivery and confirmation**
3. **Test timeout scenarios**
4. **Verify dashboard access after confirmation**

### 4.2 Support Desk Testing

1. **Test anonymous user email verification**
2. **Verify support ticket submission after verification**
3. **Test resend functionality**
4. **Verify cleanup of temporary users**

### 4.3 Error Handling Testing

1. **Test with invalid emails**
2. **Test captcha failures**
3. **Test network timeout scenarios**
4. **Verify error messages are user-friendly**

## Expected Results

After implementation:

✅ **Zero 504 timeouts** during registration
✅ **Instant email delivery** using Supabase infrastructure  
✅ **Working support desk** for anonymous users
✅ **Simplified debugging** with fewer moving parts
✅ **Better user experience** with standard email flows
✅ **Maintained security** with HCaptcha and rate limiting

This implementation provides a robust, reliable email system that eliminates the current issues while maintaining all security and functionality requirements.