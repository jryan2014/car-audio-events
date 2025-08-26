import { useEffect } from 'react';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';
import { GA_MEASUREMENT_ID } from '../utils/googleAnalytics';

const GoogleAnalytics: React.FC = () => {
  // This hook automatically tracks page views
  useGoogleAnalytics();
  
  useEffect(() => {
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
            window.gtag('config', GA_MEASUREMENT_ID);
          }
        };
      }
    }
  }, []);
  
  // Component doesn't render anything, just handles tracking
  return null;
};

export default GoogleAnalytics;