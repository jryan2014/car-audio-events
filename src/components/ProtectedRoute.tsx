import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireProfileComplete?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireProfileComplete = false // Changed default to false - only specific routes require it
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-electric-500" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if profile is complete (except for the complete-profile page itself)
  if (requireProfileComplete && !user.registrationCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Check admin requirement
  if (requireAdmin && user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // All checks passed
  return <>{children}</>;
}