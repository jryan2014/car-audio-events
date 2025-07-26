import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function NotificationRateLimitStatus() {
  const { user } = useAuth();
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    total: number;
    resetTime: Date;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.membershipType === 'admin') {
      checkRateLimit();
      // Check every minute
      const interval = setInterval(checkRateLimit, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkRateLimit = async () => {
    if (!user) return;

    try {
      // Get notifications sent in the last hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', oneHourAgo);

      if (!error) {
        const sent = count || 0;
        const limit = 100; // This matches the limit in the database function
        
        setRateLimit({
          remaining: Math.max(0, limit - sent),
          total: limit,
          resetTime: new Date(Date.now() + 3600000) // 1 hour from now
        });
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.membershipType !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-48"></div>
      </div>
    );
  }

  if (!rateLimit) {
    return null;
  }

  const percentageUsed = ((rateLimit.total - rateLimit.remaining) / rateLimit.total) * 100;
  const isNearLimit = percentageUsed > 80;
  const isAtLimit = rateLimit.remaining === 0;

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 border ${
      isAtLimit ? 'border-red-600' : isNearLimit ? 'border-yellow-600' : 'border-gray-700'
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${
          isAtLimit ? 'bg-red-600/20' : isNearLimit ? 'bg-yellow-600/20' : 'bg-green-600/20'
        }`}>
          {isAtLimit ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : isNearLimit ? (
            <Clock className="h-5 w-5 text-yellow-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="text-white font-medium">Rate Limit Status</h4>
          <p className={`text-sm mt-1 ${
            isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {rateLimit.remaining} of {rateLimit.total} notifications remaining
          </p>
          
          <div className="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${100 - percentageUsed}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Resets at {rateLimit.resetTime.toLocaleTimeString()}
          </p>
        </div>
      </div>
      
      {isAtLimit && (
        <div className="mt-3 p-3 bg-red-600/10 rounded-lg">
          <p className="text-sm text-red-400">
            You've reached the hourly notification limit. Please wait until the reset time to send more notifications.
          </p>
        </div>
      )}
    </div>
  );
}