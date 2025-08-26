declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Get GA4 Measurement ID from environment variable
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
  }
};

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track page views with custom title and enhanced parameters
export const pageviewWithTitle = (url: string, title: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Send enhanced pageview with custom parameters
    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: title,
      page_location: window.location.href,
      custom_page_title: title, // Custom dimension for clearer reporting
      page_category: title.split(' - ')[0] // Extract category from title
    });
  }
};

// Track custom events
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track user registration
export const trackUserRegistration = (method: string) => {
  event({
    action: 'sign_up',
    category: 'engagement',
    label: method,
  });
};

// Track user login
export const trackUserLogin = (method: string) => {
  event({
    action: 'login',
    category: 'engagement',
    label: method,
  });
};

// Track event registration
export const trackEventRegistration = (eventName: string, eventId: number) => {
  event({
    action: 'event_registration',
    category: 'conversion',
    label: eventName,
    value: eventId,
  });
};

// Track payment completion
export const trackPaymentCompletion = (amount: number, paymentMethod: string) => {
  event({
    action: 'purchase',
    category: 'ecommerce',
    label: paymentMethod,
    value: amount,
  });
};

// Track search
export const trackSearch = (searchTerm: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  }
};

// Track social media interactions
export const trackSocialClick = (network: string, action: string) => {
  event({
    action: 'social_click',
    category: 'social',
    label: `${network}_${action}`,
  });
};

// Track form submissions
export const trackFormSubmission = (formName: string) => {
  event({
    action: 'form_submit',
    category: 'engagement',
    label: formName,
  });
};

// Track advertisement clicks
export const trackAdClick = (adId: string, advertiserName: string) => {
  event({
    action: 'ad_click',
    category: 'advertising',
    label: `${advertiserName}_${adId}`,
  });
};

// Track error events
export const trackError = (errorMessage: string, errorLocation: string) => {
  event({
    action: 'error',
    category: 'technical',
    label: `${errorLocation}: ${errorMessage}`,
  });
};