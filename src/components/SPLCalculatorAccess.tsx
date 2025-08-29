import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { featureFlagService } from '../services/featureFlagService';
import { Calculator, Lock, AlertCircle, Wrench, Crown, Users, User } from 'lucide-react';

interface SPLCalculatorAccessProps {
  children: React.ReactNode;
}

export const SPLCalculatorAccess: React.FC<SPLCalculatorAccessProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessMode, setAccessMode] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    try {
      setIsLoading(true);
      
      // Get feature flag settings
      const flag = await featureFlagService.getFeatureFlag('spl_calculator');
      
      if (!flag) {
        // If no flag exists, default to public access
        setHasAccess(true);
        setIsEnabled(true);
        setAccessMode('all_public');
        setIsLoading(false);
        return;
      }

      setIsEnabled(flag.is_enabled);
      setAccessMode(flag.access_mode || 'disabled');

      // If feature is disabled, no one has access
      if (!flag.is_enabled || flag.access_mode === 'disabled') {
        setHasAccess(false);
        setErrorMessage('Sorry, this feature is disabled and is currently in maintenance mode.');
        return;
      }

      // Check access based on mode
      if (flag.access_mode === 'all_public' || flag.access_mode === 'all_pro') {
        // All public members (everyone can access) - all_pro is legacy name for all_public
        setHasAccess(true);
      } else if (flag.access_mode === 'all_paid') {
        // All paid members + specific users
        if (!user) {
          setHasAccess(false);
          setErrorMessage('Please sign in to access the SPL Calculator.');
        } else {
          const isPaidMember = ['pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType || '');
          
          if (isPaidMember) {
            setHasAccess(true);
          } else {
            // Check if user has specific access
            const hasSpecificAccess = await featureFlagService.checkUserAccess('spl_calculator', user.id);
            setHasAccess(hasSpecificAccess);
            
            if (!hasSpecificAccess) {
              setErrorMessage('This feature is available to paid members only. Upgrade your membership to access the SPL Calculator.');
            }
          }
        }
      } else if (flag.access_mode === 'specific_users') {
        // Only specific users
        if (!user) {
          setHasAccess(false);
          setErrorMessage('Please sign in to access the SPL Calculator.');
        } else {
          const hasSpecificAccess = await featureFlagService.checkUserAccess('spl_calculator', user.id);
          setHasAccess(hasSpecificAccess);
          
          if (!hasSpecificAccess) {
            setErrorMessage('You do not have access to this feature. Please contact support if you believe this is an error.');
          }
        }
      } else {
        // Unknown access mode, default to no access
        setHasAccess(false);
        setErrorMessage('Access configuration error. Please contact support.');
      }
    } catch (error) {
      console.error('Error checking SPL Calculator access:', error);
      // On error, default to allowing access (fail open for better UX)
      setHasAccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Checking access permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Maintenance mode
  if (!isEnabled || accessMode === 'disabled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <Wrench className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Feature Under Maintenance</h2>
            <p className="text-gray-400 mb-6">
              Sorry, this feature is disabled and is currently in maintenance mode.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              We're working to bring it back as soon as possible. Please check back later.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No access - not signed in (for paid/specific modes)
  if (!user && (accessMode === 'all_paid' || accessMode === 'specific_users')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <Lock className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-400 mb-6">
              Please sign in to access the SPL Competition Class Calculator.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No access - insufficient permissions
  if (!hasAccess) {
    const getAccessIcon = () => {
      switch (accessMode) {
        case 'all_paid':
          return <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />;
        case 'specific_users':
          return <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />;
        default:
          return <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            {getAccessIcon()}
            <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
            <p className="text-gray-400 mb-6">
              {errorMessage}
            </p>
            
            {accessMode === 'all_paid' && (
              <div className="mb-6">
                <div className="bg-electric-500/20 border border-electric-500/50 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="text-white font-semibold mb-2">Upgrade to Access</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Get unlimited access to the SPL Calculator with a paid membership:
                  </p>
                  <ul className="text-left text-gray-300 text-sm space-y-1">
                    <li>• Calculate competition classes instantly</li>
                    <li>• Support for all organizations (IASCA, MECA, etc.)</li>
                    <li>• Advanced equipment configurations</li>
                    <li>• Export and save calculations</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              {accessMode === 'all_paid' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                >
                  View Membership Plans
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access granted - render the calculator
  return <>{children}</>;
};

export default SPLCalculatorAccess;