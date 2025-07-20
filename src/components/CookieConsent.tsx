import React, { useState, useEffect } from 'react';
import { X, Cookie, Settings, Check } from 'lucide-react';
import { 
  hasConsent, 
  getConsentPreferences, 
  saveConsentPreferences, 
  CookiePreferences,
  COOKIE_CATEGORIES,
  loadConsentedScripts
} from '../utils/cookieConsent';

const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    advertising: false,
    functional: false
  });

  useEffect(() => {
    // Check if user has already consented
    if (!hasConsent()) {
      setShowBanner(true);
    } else {
      // Load scripts based on existing consent
      loadConsentedScripts();
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      advertising: true,
      functional: true
    };
    saveConsentPreferences(allAccepted);
    loadConsentedScripts();
    setShowBanner(false);
  };

  const handleAcceptSelected = () => {
    saveConsentPreferences(preferences);
    loadConsentedScripts();
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      advertising: false,
      functional: false
    };
    saveConsentPreferences(onlyNecessary);
    setShowBanner(false);
  };

  const togglePreference = (category: keyof CookiePreferences) => {
    if (category === 'necessary') return; // Can't disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8">
            {!showSettings ? (
              /* Initial Banner */
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Cookie className="h-6 w-6 text-electric-400" />
                    <h3 className="text-xl font-bold text-white">Cookie Preferences</h3>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-gray-300 mb-6 text-sm md:text-base">
                  We use cookies to enhance your experience, analyze site traffic, and serve personalized advertisements. 
                  By clicking "Accept All", you consent to our use of cookies. You can manage your preferences by clicking "Cookie Settings".
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors font-medium"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Cookie Settings</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center space-x-4 text-sm">
                  <a
                    href="/privacy-policy"
                    className="text-electric-400 hover:text-electric-300 underline"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/cookie-policy"
                    className="text-electric-400 hover:text-electric-300 underline"
                  >
                    Cookie Policy
                  </a>
                </div>
              </div>
            ) : (
              /* Settings View */
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-6 w-6 text-electric-400" />
                    <h3 className="text-xl font-bold text-white">Cookie Settings</h3>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                  {Object.entries(COOKIE_CATEGORIES).map(([key, category]) => {
                    const categoryKey = key as keyof CookiePreferences;
                    const isNecessary = categoryKey === 'necessary';
                    
                    return (
                      <div
                        key={key}
                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">
                              {category.name}
                              {isNecessary && (
                                <span className="ml-2 text-xs text-electric-400 font-normal">
                                  Always Active
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-400 mb-2">
                              {category.description}
                            </p>
                            <details className="text-xs text-gray-500">
                              <summary className="cursor-pointer hover:text-gray-400">
                                View cookies
                              </summary>
                              <div className="mt-2 space-y-1">
                                {category.cookies.map(cookie => (
                                  <div key={cookie} className="font-mono">
                                    {cookie}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={preferences[categoryKey]}
                              onChange={() => togglePreference(categoryKey)}
                              disabled={isNecessary}
                            />
                            <div className={`
                              w-11 h-6 rounded-full peer 
                              ${isNecessary 
                                ? 'bg-electric-600' 
                                : 'bg-gray-600 peer-checked:bg-electric-500'
                              }
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                              after:bg-white after:rounded-full after:h-5 after:w-5 
                              after:transition-all peer-checked:after:translate-x-full
                              ${isNecessary ? 'cursor-not-allowed opacity-75' : ''}
                            `} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAcceptSelected}
                    className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Save Preferences</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </>
  );
};

export default CookieConsent;