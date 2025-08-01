import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import LoadingSpinner from '../../../../components/LoadingSpinner';

interface EmailVerificationModalProps {
  email: string;
  captchaToken: string;
  onVerified: (email: string) => void;
  onClose: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  email,
  captchaToken,
  onVerified,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  useEffect(() => {
    // Start verification process
    sendVerificationEmail();
  }, []);
  
  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  const sendVerificationEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('support-verify-email', {
        body: {
          email,
          captcha_token: captchaToken,
          action: 'send'
        }
      });
      
      if (error) throw error;
      
      setVerificationSent(true);
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('Error sending verification:', error);
      setError(error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };
  
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('support-verify-email', {
        body: {
          email,
          code: verificationCode,
          action: 'verify'
        }
      });
      
      if (error) throw error;
      
      if (data.verified) {
        onVerified(email);
      } else {
        setError('Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    sendVerificationEmail();
  };
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Verify Your Email
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {!verificationSent ? (
          <div className="text-center py-4">
            <LoadingSpinner size="large" />
            <p className="mt-2 text-sm text-gray-500">
              Sending verification email...
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              We've sent a verification code to <strong>{email}</strong>.
              Please enter the 6-digit code below.
            </p>
            
            <div className="mb-4">
              <label htmlFor="code" className="sr-only">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="block w-full text-center text-2xl tracking-widest rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                maxLength={6}
                autoComplete="off"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="small" /> : 'Verify Email'}
            </button>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the email?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { EmailVerificationModal };