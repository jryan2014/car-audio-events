import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, Wrench, Volume2, Zap, Info } from 'lucide-react';
import { featureFlagService } from '../services/featureFlagService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import PageHeader from './PageHeader';
import Badge from './Badge';

interface SubwooferDesignerProps {
  className?: string;
}

export default function SubwooferDesigner({ className = '' }: SubwooferDesignerProps) {
  const { user } = useAuth();
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
      <div className={`bg-gray-900 min-h-screen ${className}`}>
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
      <div className={`bg-gray-900 min-h-screen ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Access Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={checkAccess}
              className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={`bg-gray-900 min-h-screen ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title={
              <div className="flex items-center justify-center gap-3">
                <Volume2 className="h-12 w-12 text-electric-500" />
                Subwoofer Designer
              </div>
            }
            subtitle="Professional box modeling and design tools"
          />

          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Access Required</h3>
                <p className="text-gray-400">
                  The Subwoofer Designer is currently in limited beta. Access is required to use this feature.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <h4 className="text-lg font-semibold text-white">Who has access?</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-electric-500 rounded-full"></div>
                    Pro members with active subscriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-electric-500 rounded-full"></div>
                    Selected beta testers
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-electric-500 rounded-full"></div>
                    Industry partners
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-4">
                  Interested in getting access? Contact our support team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/dashboard/support"
                    className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Contact Support
                  </a>
                  <a
                    href="/pricing"
                    className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    View Pro Plans
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User has access - show the actual designer interface
  return (
    <div className={`bg-gray-900 min-h-screen ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={
            <div className="flex items-center justify-center gap-3">
              <Volume2 className="h-12 w-12 text-electric-500" />
              Subwoofer Designer
              <Badge text="BETA" color="purple" size="md" />
            </div>
          }
          subtitle="Professional box modeling and design tools for car audio enthusiasts"
        />

        {/* Feature Status Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-300 font-medium">Beta Access Granted</p>
              <p className="text-blue-200/80 text-sm mt-1">
                You have access to the Subwoofer Designer beta. Features are being actively developed and tested.
              </p>
            </div>
          </div>
        </div>

        {/* Main Designer Interface */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Design Tools Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Wrench className="h-6 w-6 text-electric-500" />
                <h3 className="text-xl font-bold text-white">Design Tools</h3>
              </div>
              
              <div className="text-center py-12">
                <Settings className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-300 mb-2">Under Construction</h4>
                <p className="text-gray-400 max-w-md mx-auto">
                  The design interface is currently being developed. Check back soon for box modeling tools, 
                  frequency response calculations, and more.
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Settings */}
          <div className="space-y-6">
            {/* Quick Settings */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="h-5 w-5 text-electric-500" />
                <h4 className="text-lg font-semibold text-white">Settings</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Units</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    <option>Imperial (inches, ft³)</option>
                    <option>Metric (cm, liters)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Precision</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    <option>2 decimal places</option>
                    <option>3 decimal places</option>
                    <option>4 decimal places</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Beta Feedback */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-purple-400" />
                <h4 className="text-lg font-semibold text-white">Beta Feedback</h4>
              </div>
              <p className="text-purple-200/80 text-sm mb-4">
                Help us improve the Subwoofer Designer by sharing your feedback and feature requests.
              </p>
              <a
                href="/dashboard/support"
                className="block text-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Send Feedback
              </a>
            </div>
          </div>
        </div>

        {/* Feature Roadmap */}
        <div className="mt-12 bg-gray-800 border border-gray-700 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Coming Soon</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Box Modeling',
                description: 'Design sealed, ported, and bandpass enclosures with precise calculations',
                status: 'In Development'
              },
              {
                title: 'Driver Database',
                description: 'Comprehensive database of subwoofer specifications and T/S parameters',
                status: 'Planned'
              },
              {
                title: 'Frequency Response',
                description: 'Visualize frequency response curves and optimize your design',
                status: 'Planned'
              },
              {
                title: '3D Visualization',
                description: 'Interactive 3D models of your enclosure designs',
                status: 'Research'
              },
              {
                title: 'Material Calculator',
                description: 'Calculate wood, screws, and other materials needed for your build',
                status: 'Planned'
              },
              {
                title: 'Export & Share',
                description: 'Export designs as PDFs or share with the community',
                status: 'Planned'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <Badge 
                    text={feature.status} 
                    color={feature.status === 'In Development' ? 'blue' : feature.status === 'Planned' ? 'yellow' : 'gray'} 
                    size="sm"
                  />
                </div>
                <p className="text-sm text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}