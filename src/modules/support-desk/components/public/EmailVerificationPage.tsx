import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const email = searchParams.get('email');
  const code = searchParams.get('code');
  
  useEffect(() => {
    if (email && code) {
      verifyEmail();
    } else {
      setError('Invalid verification link');
      setVerifying(false);
    }
  }, [email, code]);
  
  const verifyEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('support-verify-email', {
        body: {
          email,
          code,
          action: 'verify'
        }
      });
      
      if (error) throw error;
      
      if (data.verified) {
        setSuccess(true);
        // Store verified email in session storage for the support form
        sessionStorage.setItem('verified_support_email', email);
        
        // Redirect to support form after 3 seconds
        setTimeout(() => {
          navigate('/support', { 
            state: { verifiedEmail: email } 
          });
        }, 3000);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Failed to verify email. Please try again.');
    } finally {
      setVerifying(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-md p-8 text-center">
          {verifying ? (
            <>
              <LoadingSpinner size="large" />
              <h2 className="mt-4 text-xl font-semibold">Verifying your email...</h2>
              <p className="mt-2 text-gray-400">Please wait while we verify your email address.</p>
            </>
          ) : success ? (
            <>
              <div className="w-16 h-16 bg-green-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
              <p className="text-gray-300 mb-4">
                Your email has been verified successfully.
              </p>
              <p className="text-sm text-gray-400">
                Redirecting you to the support form...
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={() => navigate('/support')}
                className="px-4 py-2 bg-electric-500 text-white rounded hover:bg-electric-600 transition-colors"
              >
                Go to Support Form
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;