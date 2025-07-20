import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { isCategoryAllowed } from '../utils/cookieConsent';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export function useAnalytics() {
  const location = useLocation();

  // Track page views when location changes
  useEffect(() => {
    if (isCategoryAllowed('analytics') && window.gtag) {
      window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  // Track custom events
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    if (isCategoryAllowed('analytics') && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      });
    }
  }, []);

  // Track user interactions
  const trackClick = useCallback((label: string, value?: number) => {
    trackEvent({
      category: 'User Interaction',
      action: 'click',
      label,
      value,
    });
  }, [trackEvent]);

  // Track form submissions
  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    trackEvent({
      category: 'Form',
      action: success ? 'submit_success' : 'submit_error',
      label: formName,
    });
  }, [trackEvent]);

  // Track search queries
  const trackSearch = useCallback((searchTerm: string, resultsCount: number) => {
    trackEvent({
      category: 'Search',
      action: 'search',
      label: searchTerm,
      value: resultsCount,
    });
  }, [trackEvent]);

  // Track advertisement interactions
  const trackAdClick = useCallback((adId: string, adType: string) => {
    if (isCategoryAllowed('advertising')) {
      trackEvent({
        category: 'Advertisement',
        action: 'ad_click',
        label: `${adType}_${adId}`,
      });
    }
  }, [trackEvent]);

  // Track user engagement
  const trackEngagement = useCallback((action: string, details?: string) => {
    trackEvent({
      category: 'Engagement',
      action,
      label: details,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackAdClick,
    trackEngagement,
  };
}