import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import BackupManager from '../components/BackupManager';

export default function AdminBackup() {
  const { user } = useAuth();

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    console.log('AdminBackup: Redirecting non-admin user:', user?.membershipType);
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackupManager />
      </div>
    </div>
  );
} 