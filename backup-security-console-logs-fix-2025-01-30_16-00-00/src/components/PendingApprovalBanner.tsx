import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApprovalBanner() {
  const { user } = useAuth();
  
  if (!user || (user.status !== 'pending' && user.verificationStatus !== 'pending')) {
    return null;
  }
  
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 text-sm">
              {user.status === 'pending' ? (
                <span>Your account is pending approval. Some features may be limited until an administrator approves your account.</span>
              ) : (
                <span>Your account verification is pending. Please complete verification to access all features.</span>
              )}
            </p>
          </div>
          <a 
            href="/profile?tab=verification" 
            className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
          >
            View Status
          </a>
        </div>
      </div>
    </div>
  );
}