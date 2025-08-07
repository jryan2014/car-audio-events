import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, AlertCircle, Wrench, Volume2, Calculator, Info } from 'lucide-react';
import { featureFlagService } from '../services/featureFlagService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import SEO from '../components/SEO';

export default function SubwooferDesignerSimple() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const access = await featureFlagService.checkSubwooferAccess();
      setHasAccess(access);
    } catch (err) {
      console.error('Error checking subwoofer designer access:', err);
      setError('Failed to verify access permissions');
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner 
            size="large" 
            color="electric" 
            message="Checking access permissions..." 
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={checkAccess}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="bg-gray-900 min-h-screen">
        <SEO 
          title="Subwoofer Designer - Pro Feature"
          description="Professional subwoofer box design calculator with advanced acoustic calculations"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-700/50">
            <div className="text-center max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-electric-500 to-purple-600 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Volume2 className="h-12 w-12 text-white" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Subwoofer Box Designer
              </h1>
              
              <Badge text="Pro Members Only" color="purple" size="lg" className="mb-6" />
              
              <p className="text-lg text-gray-300 mb-8">
                Advanced subwoofer enclosure calculator with professional-grade acoustic 
                calculations, 3D visualization, and cut sheet generation.
              </p>

              <div className="bg-gray-700/30 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  This Feature Includes:
                </h3>
                <ul className="text-left space-y-2 text-gray-300 max-w-md mx-auto">
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    Sealed and ported box calculations
                  </li>
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    Thiele-Small parameter optimization
                  </li>
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    3D box visualization
                  </li>
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    Port velocity and tuning calculations
                  </li>
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    Cut sheet generation for construction
                  </li>
                  <li className="flex items-start">
                    <span className="text-electric-400 mr-2">✓</span>
                    Save and share designs
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-8 py-3 bg-gradient-to-r from-electric-500 to-purple-600 text-white rounded-lg hover:from-electric-600 hover:to-purple-700 transition-all transform hover:scale-105 font-semibold"
                >
                  Upgrade to Pro
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User has access - show the interface
  return (
    <div className="bg-gray-900 min-h-screen">
      <SEO 
        title="Subwoofer Box Designer"
        description="Professional subwoofer enclosure calculator with advanced acoustic calculations"
      />
      
      <PageHeader
        title="Subwoofer Box Designer"
        subtitle="Professional enclosure calculator with advanced acoustic calculations"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Coming Soon Notice */}
        <div className="bg-gradient-to-r from-electric-500/10 to-purple-600/10 border border-electric-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-electric-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Feature Under Development
              </h3>
              <p className="text-gray-300 mb-4">
                The Subwoofer Box Designer is currently being built with advanced features 
                for professional car audio enthusiasts. Your access has been confirmed and 
                you'll be notified when the full feature is ready.
              </p>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-electric-400 mb-2 uppercase tracking-wider">
                  Coming Features:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                  <div className="flex items-center">
                    <Calculator className="h-4 w-4 text-electric-400 mr-2" />
                    Box volume calculator with Thiele-Small parameters
                  </div>
                  <div className="flex items-center">
                    <Volume2 className="h-4 w-4 text-electric-400 mr-2" />
                    Subwoofer database with 100+ models
                  </div>
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 text-electric-400 mr-2" />
                    Port tuning and velocity calculations
                  </div>
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 text-electric-400 mr-2" />
                    Cut sheet generator for building
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Calculator Interface (Placeholder) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">Box Parameters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Box Type</label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600">
                  <option>Sealed</option>
                  <option>Ported</option>
                  <option>Bandpass (Coming Soon)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Net Volume (ft³)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600"
                  placeholder="2.5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tuning Frequency (Hz)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600"
                  placeholder="32"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">Subwoofer Selection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Size</label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600">
                  <option>8"</option>
                  <option>10"</option>
                  <option>12"</option>
                  <option>15"</option>
                  <option>18"</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Brand (Optional)</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600"
                  placeholder="Enter brand name"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <div className="mt-8 text-center">
          <button className="px-8 py-3 bg-gradient-to-r from-electric-500 to-purple-600 text-white rounded-lg hover:from-electric-600 hover:to-purple-700 transition-all transform hover:scale-105 font-semibold opacity-50 cursor-not-allowed" disabled>
            Calculate (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}