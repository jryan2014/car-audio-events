import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function AuthDebug() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug Info:</h3>
      <div>Loading: {loading ? 'Yes' : 'No'}</div>
      <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
      <div>User ID: {user?.id || 'None'}</div>
      <div>User Name: {user?.name || 'None'}</div>
      <div>User Email: {user?.email || 'None'}</div>
      <div>First Name: {user?.first_name || 'None'}</div>
      <div>Last Name: {user?.last_name || 'None'}</div>
      {user ? (
        <details className="mt-2">
          <summary className="cursor-pointer">Full User Object</summary>
          <pre className="text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-32">
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
} 