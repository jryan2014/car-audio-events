import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminEmailSettings from '../components/AdminEmailSettings';

export default function AdminEmailSettingsPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Email Settings</h1>
          <p className="text-gray-400">
            Configure Postmark email integration for transactional emails, welcome messages, and notifications.
          </p>
        </div>

        <AdminEmailSettings />
      </div>
    </div>
  );
} 