import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NewsletterConfirm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
  }>({
    loading: true,
    success: false,
    message: ''
  });

  useEffect(() => {
    if (token) {
      confirmSubscription();
    }
  }, [token]);

  const confirmSubscription = async () => {
    try {
      const { data, error } = await supabase.rpc('confirm_newsletter_subscription', {
        p_confirmation_token: token
      });

      if (error) throw error;

      if (data?.success) {
        setStatus({
          loading: false,
          success: true,
          message: 'Your newsletter subscription has been confirmed successfully!'
        });
      } else {
        setStatus({
          loading: false,
          success: false,
          message: data?.message || 'Invalid or expired confirmation link.'
        });
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      setStatus({
        loading: false,
        success: false,
        message: 'An error occurred while confirming your subscription.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
          {status.loading ? (
            <>
              <Loader2 className="h-16 w-16 text-electric-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Confirming Your Subscription
              </h2>
              <p className="text-gray-400">
                Please wait while we confirm your newsletter subscription...
              </p>
            </>
          ) : status.success ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Subscription Confirmed!
              </h2>
              <p className="text-gray-400 mb-6">
                {status.message}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  You'll receive our latest updates and exclusive content directly to your inbox.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 font-medium"
                >
                  Go to Homepage
                </button>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Confirmation Failed
              </h2>
              <p className="text-gray-400 mb-6">
                {status.message}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  The confirmation link may have expired or already been used. 
                  Please try subscribing again from the footer.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Go to Homepage
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
            <Mail className="h-4 w-4" />
            <span>Questions? Contact support@caraudioevents.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}