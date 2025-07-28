import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function TestPaymentConfig() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in as an admin to view this page');
        return;
      }

      // Call the test function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-payment-env`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to check configuration');
      }

      const data = await response.json();
      setResults(data);

    } catch (err: any) {
      setError(err.message || 'Failed to verify configuration');
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (value: string) => {
    if (value === 'NOT SET') {
      return <span className="text-red-400">❌ NOT SET</span>;
    }
    return <span className="text-green-400">✅ Set ({value})</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Checking Payment Configuration...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Payment Configuration Check</h1>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Payment Configuration Verification</h1>
        
        {/* Database Configuration */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-electric-400">Database Configuration</h2>
          <div className="space-y-2">
            <div>Mode: {renderStatus(results?.database_config?.mode)}</div>
            <div>Stripe Active: {renderStatus(results?.database_config?.stripe_active)}</div>
            <div>PayPal Active: {renderStatus(results?.database_config?.paypal_active)}</div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-electric-400">Environment Variables (Supabase Edge Functions)</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Payment Mode</h3>
            <div>PAYMENT_MODE: {renderStatus(results?.environment_variables?.payment_mode?.PAYMENT_MODE)}</div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Stripe Test Keys</h3>
            <div>Secret Key: {renderStatus(results?.environment_variables?.stripe_test?.STRIPE_TEST_SECRET_KEY)}</div>
            <div>Webhook Secret: {renderStatus(results?.environment_variables?.stripe_test?.STRIPE_TEST_WEBHOOK_SECRET)}</div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Stripe Live Keys</h3>
            <div>Secret Key: {renderStatus(results?.environment_variables?.stripe_live?.STRIPE_LIVE_SECRET_KEY)}</div>
            <div>Webhook Secret: {renderStatus(results?.environment_variables?.stripe_live?.STRIPE_LIVE_WEBHOOK_SECRET)}</div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Stripe Current Mode Keys</h3>
            <div>STRIPE_SECRET_KEY: {renderStatus(results?.environment_variables?.stripe_current?.STRIPE_SECRET_KEY)}</div>
            <div>STRIPE_WEBHOOK_SECRET: {renderStatus(results?.environment_variables?.stripe_current?.STRIPE_WEBHOOK_SECRET)}</div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">PayPal Keys</h3>
            <div>Test Secret: {renderStatus(results?.environment_variables?.paypal_test?.PAYPAL_TEST_CLIENT_SECRET)}</div>
            <div>Live Secret: {renderStatus(results?.environment_variables?.paypal_live?.PAYPAL_LIVE_CLIENT_SECRET)}</div>
          </div>
        </div>

        {/* Recommendations */}
        {results?.recommendations && results.recommendations.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
              <Info className="h-6 w-6 mr-2" />
              Recommendations
            </h2>
            <ul className="list-disc list-inside space-y-2">
              {results.recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-yellow-300">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-electric-400">Next Steps</h2>
          <div className="space-y-3">
            <p className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
              <span>If all environment variables show as "Set", you can proceed to run the migration to remove secrets from the database.</span>
            </p>
            <p className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
              <span>Any "NOT SET" values need to be added to Supabase Edge Functions environment variables before proceeding.</span>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={checkConfiguration}
            className="bg-electric-500 hover:bg-electric-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Re-check Configuration
          </button>
        </div>
      </div>
    </div>
  );
}