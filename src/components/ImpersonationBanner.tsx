import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, X } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, user, stopImpersonation } = useAuth();

  if (!isImpersonating || !user) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-5 w-5" />
          <span className="font-medium">
            Impersonating: {user.name || user.email} ({user.membershipType})
          </span>
        </div>
        <button
          onClick={stopImpersonation}
          className="flex items-center space-x-2 bg-orange-700 hover:bg-orange-800 px-3 py-1 rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Stop Impersonation</span>
        </button>
      </div>
    </div>
  );
}