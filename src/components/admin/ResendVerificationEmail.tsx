import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResendVerificationEmail() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      // First, find the user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, verification_status')
        .eq('email', email.trim())
        .single();

      if (userError || !user) {
        throw new Error('User not found with this email address');
      }

      if (user.verification_status === 'verified') {
        setMessage('This user\'s email is already verified');
        return;
      }

      // Send the verification email
      const { data, error: sendError } = await supabase.functions.invoke('send-email-verification-link', {
        body: {
          email: user.email,
          userId: user.id
        }
      });

      if (sendError) {
        throw sendError;
      }

      setMessage(`Verification email sent successfully to ${user.email}`);
      setEmail('');
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Mail className="h-6 w-6 text-electric-500" />
        <h3 className="text-lg font-medium text-white">Resend Verification Email</h3>
      </div>

      <form onSubmit={handleResend} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            User Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Enter the email address of the user who needs their verification email resent
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-500/20 border border-red-500/30 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-500/20 border border-green-500/30 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-300">{message}</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-electric-600 hover:bg-electric-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Sending...
            </>
          ) : (
            <>
              <Send className="-ml-1 mr-2 h-4 w-4" />
              Send Verification Email
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-700 pt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• This sends a verification link to the user's email address</li>
          <li>• The link is valid for 24 hours</li>
          <li>• The user must click the link to verify their email</li>
          <li>• Once verified, they can log in and complete their profile</li>
        </ul>
      </div>
    </div>
  );
}