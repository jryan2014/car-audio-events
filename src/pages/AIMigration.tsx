import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { aiConfigService } from '../services/aiConfigService';
import { Database, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function AIMigration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [migrationStatus, setMigrationStatus] = useState<'checking' | 'ready' | 'migrating' | 'complete' | 'error'>('checking');
  const [localConfigs, setLocalConfigs] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = () => {
    const savedConfigs = localStorage.getItem('ai-service-configs');
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        setLocalConfigs(configs);
        setMigrationStatus('ready');
      } catch (e) {
        setMigrationStatus('error');
        setError('Failed to parse localStorage configurations');
      }
    } else {
      setMigrationStatus('complete');
    }
  };

  const handleMigration = async () => {
    setMigrationStatus('migrating');
    setError('');

    try {
      const success = await aiConfigService.migrateFromLocalStorage();
      if (success) {
        setMigrationStatus('complete');
        setTimeout(() => {
          navigate('/admin/ai-configuration');
        }, 2000);
      } else {
        setMigrationStatus('error');
        setError('Migration failed. Please check the console for details.');
      }
    } catch (err) {
      setMigrationStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="h-8 w-8 text-electric-500" />
            <h1 className="text-2xl font-bold text-white">AI Configuration Migration</h1>
          </div>

          {migrationStatus === 'checking' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-electric-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Checking migration status...</p>
            </div>
          )}

          {migrationStatus === 'ready' && (
            <div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-400 mb-1">Migration Required</h3>
                    <p className="text-gray-300">
                      We've detected AI configurations stored in your browser's local storage. 
                      These need to be migrated to the database for better security and persistence.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Configurations Found:</h3>
                <div className="space-y-3">
                  {Object.entries(localConfigs).map(([provider, config]: [string, any]) => (
                    <div key={provider} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{provider}</p>
                          <p className="text-sm text-gray-400">
                            API Key: {config.apiKey ? `***${config.apiKey.slice(-4)}` : 'Not set'}
                          </p>
                        </div>
                        <div className="text-sm text-gray-400">
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-400 mb-2">What will happen:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  <li>Your API keys will be securely stored in the database</li>
                  <li>Configurations will persist across browsers and devices</li>
                  <li>Local storage will be cleared after successful migration</li>
                  <li>You'll be redirected to the AI Configuration page</li>
                </ul>
              </div>

              <button
                onClick={handleMigration}
                className="w-full bg-electric-500 text-white py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Database className="h-5 w-5" />
                <span>Migrate to Database</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {migrationStatus === 'migrating' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-electric-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Migrating configurations to database...</p>
            </div>
          )}

          {migrationStatus === 'complete' && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Migration Complete!</h3>
              <p className="text-gray-400 mb-4">
                Your AI configurations have been successfully migrated to the database.
              </p>
              <p className="text-sm text-gray-500">Redirecting to AI Configuration page...</p>
            </div>
          )}

          {migrationStatus === 'error' && (
            <div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-400 mb-1">Migration Failed</h3>
                    <p className="text-gray-300">{error}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={checkMigrationStatus}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/admin/ai-configuration')}
                  className="flex-1 bg-electric-500 text-white py-2 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  Go to AI Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}