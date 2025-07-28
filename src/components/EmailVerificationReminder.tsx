import React, { useState } from 'react';
import { AlertTriangle, Mail, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function EmailVerificationReminder() {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Don't show if user is verified or doesn't exist
  if (!user || user.verificationStatus === 'verified' || user.emailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsSending(true);
    setError('');
    setSent(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (resendError) {
        throw resendError;
      }

      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      console.error('Error resending verification:', err);
      setError(err.message || 'Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-yellow-400 font-semibold mb-1">Email Verification Required</h3>
          <p className="text-gray-300 text-sm mb-3">
            Please verify your email address to access all features. Check your inbox for a verification link.
          </p>
          
          {error && (
            <div className="text-red-400 text-sm mb-2">
              {error}
            </div>
          )}

          {sent ? (
            <div className="flex items-center space-x-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Verification email sent! Check your inbox.</span>
            </div>
          ) : (
            <button
              onClick={handleResendVerification}
              disabled={isSending}
              className="inline-flex items-center space-x-2 text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}