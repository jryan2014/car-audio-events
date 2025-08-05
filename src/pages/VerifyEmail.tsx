import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No verification token provided');
      setVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      // Call the edge function to verify the token
      const { data, error } = await supabase.functions.invoke('verify-email-link', {
        body: { token }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to verify email');
      }

      setVerified(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email verified successfully! Please log in to complete your profile setup.',
            verified: true 
          }
        });
      }, 3000);
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Failed to verify email');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Loader className="mx-auto h-12 w-12 text-electric-500 animate-spin" />
          <h2 className="mt-6 text-3xl font-black text-white">
            Verifying Your Email
          </h2>
          <p className="mt-2 text-gray-400">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-black text-white">
            Email Verified!
          </h2>
          <p className="mt-2 text-gray-400">
            Your email has been successfully verified.
          </p>
          <p className="mt-4 text-gray-300">
            Redirecting you to the login page...
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-electric-400 hover:text-electric-300 font-medium"
            >
              Click here if not redirected
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
          <XCircle className="h-10 w-10 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-black text-white">
          Verification Failed
        </h2>
        <p className="mt-2 text-gray-400">
          {error}
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-electric-600 hover:bg-electric-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </button>
          <button
            onClick={() => navigate('/register')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Register Again
          </button>
        </div>
      </div>
    </div>
  );
}