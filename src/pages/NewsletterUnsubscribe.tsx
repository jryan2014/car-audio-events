import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NewsletterUnsubscribe() {
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
      unsubscribe();
    }
  }, [token]);

  const unsubscribe = async () => {
    try {
      const { data, error } = await supabase.rpc('unsubscribe_from_newsletter', {
        p_unsubscribe_token: token
      });

      if (error) throw error;

      if (data?.success) {
        setStatus({
          loading: false,
          success: true,
          message: 'You have been successfully unsubscribed from our newsletter.'
        });
      } else {
        setStatus({
          loading: false,
          success: false,
          message: data?.message || 'Invalid unsubscribe link.'
        });
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus({
        loading: false,
        success: false,
        message: 'An error occurred while processing your request.'
      });
    }
  };

  const resubscribe = () => {
    navigate('/#newsletter');
    window.scrollTo(0, document.body.scrollHeight);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
          {status.loading ? (
            <>
              <Loader2 className="h-16 w-16 text-electric-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Processing Your Request
              </h2>
              <p className="text-gray-400">
                Please wait while we unsubscribe you from our newsletter...
              </p>
            </>
          ) : status.success ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Unsubscribed Successfully
              </h2>
              <p className="text-gray-400 mb-6">
                {status.message}
              </p>
              <div className="space-y-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    We're sorry to see you go! You won't receive any more newsletters from us.
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Changed your mind? You can always resubscribe anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                  >
                    Go to Homepage
                  </button>
                  <button
                    onClick={resubscribe}
                    className="flex-1 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 font-medium"
                  >
                    Resubscribe
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Unsubscribe Failed
              </h2>
              <p className="text-gray-400 mb-6">
                {status.message}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  The unsubscribe link may be invalid or expired. 
                  Please contact support if you continue to receive unwanted emails.
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
            <span>Need help? Contact support@caraudioevents.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}