// Cookie consent management utilities
export interface CookiePreferences {
  necessary: boolean; // Always true - required cookies
  analytics: boolean;
  advertising: boolean;
  functional: boolean;
}

export interface ConsentRecord {
  timestamp: string;
  preferences: CookiePreferences;
  ipAddress?: string;
  userAgent?: string;
}

const CONSENT_COOKIE_NAME = 'car_audio_cookie_consent';
const CONSENT_DURATION = 365; // days

// Default preferences (only necessary cookies enabled)
const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  advertising: false,
  functional: false
};

// Get current consent preferences
export function getConsentPreferences(): CookiePreferences {
  try {
    const consent = localStorage.getItem(CONSENT_COOKIE_NAME);
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.preferences || DEFAULT_PREFERENCES;
    }
  } catch (error) {
    console.error('Error reading consent preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

// Check if user has given consent
export function hasConsent(): boolean {
  try {
    const consent = localStorage.getItem(CONSENT_COOKIE_NAME);
    return !!consent;
  } catch (error) {
    return false;
  }
}

// Save consent preferences
export function saveConsentPreferences(preferences: CookiePreferences): void {
  const consentRecord: ConsentRecord = {
    timestamp: new Date().toISOString(),
    preferences: {
      ...preferences,
      necessary: true // Always true
    },
    userAgent: navigator.userAgent
  };

  try {
    localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(consentRecord));
    
    // Set a cookie as backup (for server-side checking)
    document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify(preferences)};max-age=${CONSENT_DURATION * 24 * 60 * 60};path=/;SameSite=Strict`;
    
    // Trigger consent change event
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
      detail: preferences 
    }));
  } catch (error) {
    console.error('Error saving consent preferences:', error);
  }
}

// Revoke consent
export function revokeConsent(): void {
  try {
    localStorage.removeItem(CONSENT_COOKIE_NAME);
    document.cookie = `${CONSENT_COOKIE_NAME}=;max-age=0;path=/`;
    
    // Trigger consent change event
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
      detail: DEFAULT_PREFERENCES 
    }));
  } catch (error) {
    console.error('Error revoking consent:', error);
  }
}

// Check if a specific cookie category is allowed
export function isCategoryAllowed(category: keyof CookiePreferences): boolean {
  const preferences = getConsentPreferences();
  return preferences[category] === true;
}

// Load external scripts based on consent
export function loadConsentedScripts(): void {
  const preferences = getConsentPreferences();

  // Analytics scripts
  if (preferences.analytics) {
    loadGoogleAnalytics();
    // Add other analytics scripts here
  }

  // Advertising scripts
  if (preferences.advertising) {
    loadAdvertisingScripts();
  }

  // Functional scripts (e.g., enhanced maps, social media)
  if (preferences.functional) {
    loadFunctionalScripts();
  }
}

// Load Google Analytics
function loadGoogleAnalytics(): void {
  // Only load if not already loaded
  if (window.gtag) return;

  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!GA_MEASUREMENT_ID) return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true, // GDPR compliance
    cookie_flags: 'SameSite=None;Secure'
  });
}

// Load advertising scripts
function loadAdvertisingScripts(): void {
  // Add your advertising scripts here
  // Example: Google AdSense, Facebook Pixel, etc.
  console.log('Loading advertising scripts...');
}

// Load functional scripts
function loadFunctionalScripts(): void {
  // Enhanced functionality scripts
  console.log('Loading functional scripts...');
}

// Cookie categories information
export const COOKIE_CATEGORIES = {
  necessary: {
    name: 'Necessary',
    description: 'Essential cookies required for the website to function properly. These cannot be disabled.',
    cookies: ['car_audio_cookie_consent', 'sb-*'] // Supabase auth cookies
  },
  analytics: {
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
    cookies: ['_ga', '_gid', '_gat', '_ga_*']
  },
  advertising: {
    name: 'Advertising',
    description: 'Used to deliver relevant advertisements and track ad campaign performance.',
    cookies: ['_fbp', 'fr', 'tr', 'ads_*']
  },
  functional: {
    name: 'Functional',
    description: 'Enable enhanced functionality like social media sharing and personalized features.',
    cookies: ['locale', 'theme', 'preferences']
  }
};

// Declare global types
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}