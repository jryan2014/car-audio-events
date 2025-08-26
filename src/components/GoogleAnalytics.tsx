import { useEffect } from 'react';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';
import { GA_MEASUREMENT_ID } from '../utils/googleAnalytics';

const GoogleAnalytics: React.FC = () => {
  // This hook automatically tracks page views
  useGoogleAnalytics();
  
  useEffect(() => {
    // Check if GA is disabled in development
    const isDisabledInDev = import.meta.env.DEV && import.meta.env.VITE_DISABLE_GA_IN_DEV === 'true';
    
    if (isDisabledInDev) {
      console.log('📊 Google Analytics is disabled in development. Set VITE_DISABLE_GA_IN_DEV=false to enable.');
      return;
    }
    
    // Only load GA4 script if we have a valid measurement ID
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
      
      if (!existingScript) {
        // Load the GA4 script dynamically
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);
        
        // Initialize gtag after script loads
        script.onload = () => {
          if (window.gtag) {
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID, {
              // In development, use debug mode and allow localhost
              debug_mode: import.meta.env.DEV,
              // Cookie settings for development
              cookie_domain: import.meta.env.DEV ? 'none' : 'auto',
              cookie_flags: import.meta.env.DEV ? 'SameSite=Lax' : undefined,
            });
          }
        };
        
        // In development, log tracking events to console
        if (import.meta.env.DEV) {
          console.log('🔍 GA4 initialized in development mode - tracking may be limited');
        }
      }
    }
  }, []);
  
  // Component doesn't render anything, just handles tracking
  return null;
};

export default GoogleAnalytics;