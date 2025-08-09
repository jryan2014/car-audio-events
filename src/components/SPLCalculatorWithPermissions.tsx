import React, { useState, useEffect } from 'react';
import { useTieredPermissions, PermissionChecks } from '../hooks/useTieredPermissions';
import { Calculator, Lock, Zap, AlertCircle, BarChart3, Download, History } from 'lucide-react';

interface SPLCalculatorProps {
  className?: string;
}

const SPLCalculatorWithPermissions: React.FC<SPLCalculatorProps> = ({ className = '' }) => {
  const permissions = useTieredPermissions();
  const [calculatorData, setCalculatorData] = useState({
    power: 100,
    sensitivity: 87,
    distance: 1,
    cabinGain: 0
  });
  const [result, setResult] = useState<number | null>(null);
  const [permissionStates, setPermissionStates] = useState({
    basicCalculations: false,
    advancedModeling: false,
    frequencyAnalysis: false,
    optimization: false,
    historicalTracking: false,
    exportData: false,
    tier: null as string | null
  });
  const [usageLimits, setUsageLimits] = useState({
    basic: { remaining: 0, limit: 0 },
    export: { remaining: 0, limit: 0 }
  });

  useEffect(() => {
    checkPermissions();
  }, [permissions]);

  const checkPermissions = async () => {
    try {
      const checks = await permissions.checkMultiplePermissions([
        PermissionChecks.splCalculatorBasic,
        PermissionChecks.splCalculatorAdvanced,
        { feature: 'spl_calculator', subFeature: 'frequency_analysis', action: 'view' },
        { feature: 'spl_calculator', subFeature: 'optimization', action: 'view' },
        { feature: 'spl_calculator', subFeature: 'historical_tracking', action: 'view' },
        PermissionChecks.splCalculatorExport
      ]);

      setPermissionStates({
        basicCalculations: checks['spl_calculator::basic_calculations:view']?.hasPermission || false,
        advancedModeling: checks['spl_calculator::advanced_modeling:view']?.hasPermission || false,
        frequencyAnalysis: checks['spl_calculator::frequency_analysis:view']?.hasPermission || false,
        optimization: checks['spl_calculator::optimization:view']?.hasPermission || false,
        historicalTracking: checks['spl_calculator::historical_tracking:view']?.hasPermission || false,
        exportData: checks['spl_calculator:::export']?.hasPermission || false,
        tier: checks['spl_calculator::basic_calculations:view']?.tier || null
      });

      // Check usage limits
      const basicUsage = await permissions.checkUsageLimit('spl_calculator', 'view', 'basic_calculations');
      const exportUsage = await permissions.checkUsageLimit('spl_calculator', 'export');

      setUsageLimits({
        basic: basicUsage.hasLimit ? { remaining: basicUsage.remaining || 0, limit: basicUsage.limit || 0 } : { remaining: Infinity, limit: Infinity },
        export: exportUsage.hasLimit ? { remaining: exportUsage.remaining || 0, limit: exportUsage.limit || 0 } : { remaining: Infinity, limit: Infinity }
      });
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const calculateSPL = async () => {
    if (!permissionStates.basicCalculations) {
      alert('You need basic calculation permissions to use this feature');
      return;
    }

    if (usageLimits.basic.remaining === 0) {
      alert('You have reached your daily calculation limit. Please upgrade your plan for unlimited access.');
      return;
    }

    try {
      // Perform basic SPL calculation
      const spl = 20 * Math.log10(calculatorData.power) + calculatorData.sensitivity + 
                  calculatorData.cabinGain - 20 * Math.log10(calculatorData.distance);
      
      setResult(Math.round(spl * 10) / 10);

      // Track usage
      const tracked = await permissions.trackUsage({
        feature: 'spl_calculator',
        subFeature: 'basic_calculations',
        action: 'view',
        data: {
          power: calculatorData.power,
          sensitivity: calculatorData.sensitivity,
          distance: calculatorData.distance,
          cabinGain: calculatorData.cabinGain,
          result: spl
        }
      });

      if (tracked) {
        // Refresh usage limits
        checkPermissions();
      }
    } catch (error) {
      console.error('Calculation failed:', error);
    }
  };

  const performAdvancedCalculation = async () => {
    if (!permissionStates.advancedModeling) {
      alert('Advanced modeling requires a Pro Competitor subscription or higher');
      return;
    }

    // Simulate advanced calculation with more complex algorithms
    const advancedResult = await permissions.checkAndTrack(
      PermissionChecks.splCalculatorAdvanced,
      { calculationType: 'advanced_modeling', complexity: 'high' }
    );

    if (advancedResult.canProceed) {
      alert('Advanced modeling calculation performed! (This would show detailed acoustic modeling results)');
    }
  };

  const exportData = async () => {
    if (!permissionStates.exportData) {
      alert('Data export requires a paid subscription');
      return;
    }

    if (usageLimits.export.remaining === 0) {
      alert('You have reached your export limit for today');
      return;
    }

    const exportResult = await permissions.checkAndTrack(
      PermissionChecks.splCalculatorExport,
      { exportType: 'csv', dataPoints: 1 }
    );

    if (exportResult.canProceed) {
      // Simulate file download
      alert('Data exported successfully! (This would trigger a file download)');
      checkPermissions(); // Refresh limits
    }
  };

  const PermissionGate: React.FC<{ 
    hasPermission: boolean; 
    children: React.ReactNode; 
    upgradeMessage?: string;
    usageRemaining?: number;
    usageLimit?: number;
  }> = ({ hasPermission, children, upgradeMessage, usageRemaining, usageLimit }) => {
    if (!hasPermission) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300 mb-2">
                {upgradeMessage || 'This feature requires a higher subscription tier'}
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                Upgrade Plan
              </button>
            </div>
          </div>
          <div className="filter blur-sm pointer-events-none">
            {children}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {children}
        {usageRemaining !== undefined && usageLimit !== undefined && usageLimit < Infinity && (
          <div className="mt-2 flex items-center text-xs text-gray-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            <span>{usageRemaining} / {usageLimit} uses remaining today</span>
          </div>
        )}
      </div>
    );
  };

  if (!permissionStates.basicCalculations && permissionStates.tier === null) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">SPL Calculator</h3>
        <p className="text-gray-300 mb-4">Please log in to access the SPL Calculator</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">SPL Calculator</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Current Tier: {permissionStates.tier || 'Unknown'}</span>
              {usageLimits.basic.limit < Infinity && (
                <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs">
                  {usageLimits.basic.remaining} uses left today
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Calculator */}
        <PermissionGate 
          hasPermission={permissionStates.basicCalculations}
          upgradeMessage="Sign up for free to access basic SPL calculations"
          usageRemaining={usageLimits.basic.remaining}
          usageLimit={usageLimits.basic.limit}
        >
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Basic SPL Calculation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Amplifier Power (Watts)
                </label>
                <input
                  type="number"
                  value={calculatorData.power}
                  onChange={(e) => setCalculatorData({ ...calculatorData, power: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Speaker Sensitivity (dB)
                </label>
                <input
                  type="number"
                  value={calculatorData.sensitivity}
                  onChange={(e) => setCalculatorData({ ...calculatorData, sensitivity: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Distance (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calculatorData.distance}
                  onChange={(e) => setCalculatorData({ ...calculatorData, distance: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cabin Gain (dB)
                </label>
                <input
                  type="number"
                  value={calculatorData.cabinGain}
                  onChange={(e) => setCalculatorData({ ...calculatorData, cabinGain: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                />
              </div>
              
              <button
                onClick={calculateSPL}
                disabled={usageLimits.basic.remaining === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2"
              >
                <Calculator className="w-4 h-4" />
                <span>Calculate SPL</span>
              </button>
              
              {result !== null && (
                <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-300">{result} dB SPL</div>
                </div>
              )}
            </div>
          </div>
        </PermissionGate>

        {/* Advanced Features */}
        <div className="space-y-4">
          {/* Advanced Modeling */}
          <PermissionGate 
            hasPermission={permissionStates.advancedModeling}
            upgradeMessage="Upgrade to Pro Competitor for advanced acoustic modeling"
          >
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Advanced Modeling
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Complex acoustic simulations with room interactions and frequency response analysis
              </p>
              <button
                onClick={performAdvancedCalculation}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
              >
                Run Advanced Model
              </button>
            </div>
          </PermissionGate>

          {/* Frequency Analysis */}
          <PermissionGate 
            hasPermission={permissionStates.frequencyAnalysis}
            upgradeMessage="Available for Free Competitors and above"
          >
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                Frequency Analysis
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Detailed frequency response and harmonic distortion analysis
              </p>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md">
                Analyze Frequency Response
              </button>
            </div>
          </PermissionGate>

          {/* System Optimization */}
          <PermissionGate 
            hasPermission={permissionStates.optimization}
            upgradeMessage="Pro Competitor feature - automatic system optimization"
          >
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-green-400" />
                System Optimization
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                AI-powered system optimization recommendations
              </p>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                Optimize System
              </button>
            </div>
          </PermissionGate>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex space-x-4">
        <PermissionGate 
          hasPermission={permissionStates.exportData}
          upgradeMessage="Data export available for paid plans"
          usageRemaining={usageLimits.export.remaining}
          usageLimit={usageLimits.export.limit}
        >
          <button
            onClick={exportData}
            disabled={usageLimits.export.remaining === 0}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </PermissionGate>

        <PermissionGate 
          hasPermission={permissionStates.historicalTracking}
          upgradeMessage="Historical tracking available for competitors and above"
        >
          <button className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">
            <History className="w-4 h-4" />
            <span>View History</span>
          </button>
        </PermissionGate>
      </div>
    </div>
  );
};

export default SPLCalculatorWithPermissions;