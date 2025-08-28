import React from 'react';
import { Package, Building, Wrench, Loader2, AlertCircle } from 'lucide-react';

interface LoadingStateProps {
  type?: 'listings' | 'detail' | 'form';
  message?: string;
  showSkeletons?: boolean;
  count?: number;
}

export const DirectoryLoadingState: React.FC<LoadingStateProps> = ({ 
  type = 'listings', 
  message,
  showSkeletons = true,
  count = 6
}) => {
  if (type === 'detail') {
    return (
      <div className="min-h-screen bg-gray-900 pt-32">
        <div className="container mx-auto px-4 py-8">
          {/* Loading header */}
          <div className="mb-8">
            <div className="h-8 bg-gray-700 rounded animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header card */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-24 h-24 bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-1/2"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3"></div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-5/6"></div>
                </div>
              </div>

              {/* Services card */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="h-6 bg-gray-700 rounded animate-pulse mb-4 w-1/3"></div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="h-6 bg-gray-700 rounded animate-pulse mb-4 w-2/3"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-32">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="h-8 bg-gray-700 rounded animate-pulse mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2"></div>
          </div>

          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="h-6 bg-gray-700 rounded animate-pulse mb-4 w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                  <div className="md:col-span-2 h-24 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default listings loading
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 bg-gray-700 rounded animate-pulse mb-4 mx-auto w-1/2"></div>
          <div className="h-6 bg-gray-800 rounded animate-pulse mx-auto w-2/3"></div>
        </div>

        {/* Filter skeleton */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Loading message */}
        {message && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* Listings grid skeleton */}
        {showSkeletons && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="w-full h-48 bg-gray-700 animate-pulse"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-800 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-800 rounded animate-pulse w-4/5"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  type?: 'listings' | 'detail' | 'form';
}

export const DirectoryErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  onRetry, 
  showRetry = true,
  type = 'listings'
}) => {
  const getErrorIcon = () => {
    switch (type) {
      case 'detail': return <Package className="h-16 w-16 text-red-400" />;
      case 'form': return <Wrench className="h-16 w-16 text-red-400" />;
      default: return <Building className="h-16 w-16 text-red-400" />;
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'detail': return 'Unable to Load Listing';
      case 'form': return 'Form Error';
      default: return 'Unable to Load Directory';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-32">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8">
            {getErrorIcon()}
            <h2 className="text-2xl font-bold text-white mb-4 mt-4">
              {getErrorTitle()}
            </h2>
            <p className="text-gray-300 mb-6">
              {error}
            </p>
            
            {showRetry && onRetry && (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onRetry}
                  className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                >
                  <Loader2 className="h-5 w-5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Network status indicator
export const DirectoryNetworkStatus: React.FC<{ isOnline: boolean }> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
      <div className="flex items-center justify-center space-x-2">
        <AlertCircle className="h-4 w-4" />
        <span>You're offline. Some features may not work properly.</span>
      </div>
    </div>
  );
};

export default DirectoryLoadingState;