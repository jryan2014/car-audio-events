import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminContactSettings from '../components/AdminContactSettings';

export default function AdminContactSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.membershipType !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Contact Settings</h1>
          <p className="text-gray-400">
            Configure contact information displayed in the footer and throughout the platform.
          </p>
        </div>

        <AdminContactSettings />
      </div>
    </div>
  );
} 