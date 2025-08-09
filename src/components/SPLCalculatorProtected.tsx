import React, { useState, useEffect } from 'react';
import { Calculator, Lock, AlertCircle, TrendingUp, Zap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnhancedPermissions } from '../hooks/useEnhancedPermissions';
import { FeatureAccess } from '../services/enhancedPermissionService';

interface SPLCalculatorProtectedProps {
  children: React.ReactNode;
}

export const SPLCalculatorProtected: React.FC<SPLCalculatorProtectedProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = useEnhancedPermissions();
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState<number>(0);

  useEffect(() => {
    checkAccess();
  }, [user, permissions.isEnhancedMode]);

  const checkAccess = async () => {
    setIsChecking(true);
    
    try {
      // Check feature access
      const accessResult = await permissions.checkFeatureAccess('spl_calculator', 'calculate');
      setAccess(accessResult);
      
      // If access is allowed, track the usage
      if (accessResult.allowed) {
        await permissions.trackUsage('spl_calculator', 'view');
        
        // Get remaining usage if in enhanced mode
        if (permissions.isEnhancedMode && accessResult.remainingUsage !== undefined) {
          const limit = accessResult.limit || 0;
          const used = limit - (accessResult.remainingUsage || 0);
          setDailyUsage(used);
          setDailyLimit(limit);
        }
      } else if (accessResult.upgradeRequired) {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Error checking SPL Calculator access:', error);
      setAccess({ allowed: false, reason: 'Error checking permissions' });
    } finally {
      setIsChecking(false);
    }
  };

  // Track each calculation
  const trackCalculation = async () => {
    if (permissions.isEnhancedMode && access?.allowed) {
      await permissions.trackUsage('spl_calculator', 'calculate');
      
      // Update usage display
      const newUsage = dailyUsage + 1;
      setDailyUsage(newUsage);
      
      // Check if limit reached
      if (dailyLimit > 0 && newUsage >= dailyLimit) {
        setAccess({
          ...access,
          allowed: false,
          reason: `Daily limit of ${dailyLimit} calculations reached`,
          upgradeRequired: true
        });
        setShowUpgradeModal(true);
      }
    }
  };

  // Loading state
  if (isChecking || permissions.isLoading) {
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

  // Access denied - not logged in
  if (!user) {
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

  // Access denied - insufficient permissions
  if (!access?.allowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Upgrade Required</h2>
              <p className="text-gray-400 mb-6">
                {access?.reason || 'You need a Pro Competitor membership or higher to access the SPL Calculator.'}
              </p>
              
              {/* Show what each tier gets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Free Competitor</h3>
                  <p className="text-gray-400 text-sm mb-3">Basic Access</p>
                  <ul className="text-left text-gray-400 text-sm space-y-1">
                    <li>• 50 calculations/day</li>
                    <li>• Basic formulas</li>
                    <li>• Standard classes</li>
                  </ul>
                </div>
                
                <div className="bg-electric-500/20 border border-electric-500 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Pro Competitor</h3>
                  <p className="text-electric-400 text-sm mb-3">Full Access</p>
                  <ul className="text-left text-gray-300 text-sm space-y-1">
                    <li>• Unlimited calculations</li>
                    <li>• Advanced formulas</li>
                    <li>• All competition classes</li>
                    <li>• Export results</li>
                  </ul>
                </div>
                
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Business</h3>
                  <p className="text-gray-400 text-sm mb-3">Professional</p>
                  <ul className="text-left text-gray-400 text-sm space-y-1">
                    <li>• Everything in Pro</li>
                    <li>• API access</li>
                    <li>• Bulk calculations</li>
                    <li>• Team sharing</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                >
                  View Plans
                </button>
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
      </div>
    );
  }

  // Access granted - show usage info if enhanced mode
  return (
    <>
      {permissions.isEnhancedMode && dailyLimit > 0 && (
        <div className="fixed top-20 right-4 z-40">
          <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calculator className="h-5 w-5 text-electric-500" />
              <div>
                <p className="text-white text-sm font-medium">Daily Usage</p>
                <p className="text-gray-400 text-xs">
                  {dailyUsage} / {dailyLimit === -1 ? '∞' : dailyLimit} calculations
                </p>
                {dailyLimit > 0 && dailyUsage >= dailyLimit * 0.8 && (
                  <p className="text-yellow-500 text-xs mt-1">
                    {Math.max(0, dailyLimit - dailyUsage)} remaining today
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inject calculation tracking into the calculator */}
      <div onClick={trackCalculation}>
        {children}
      </div>
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Upgrade for More</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-400 mb-4">
                You've reached your daily limit. Upgrade to Pro for unlimited access!
              </p>
              
              <div className="bg-electric-500/20 border border-electric-500 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-electric-500" />
                  Pro Competitor Benefits
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>✓ Unlimited calculations</li>
                  <li>✓ Advanced competition formulas</li>
                  <li>✓ Export and save results</li>
                  <li>✓ Historical tracking</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};