import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as ga from '../utils/googleAnalytics';

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever the location changes
    const fullPath = location.pathname + location.search;
    
    // Enhanced tracking with page titles for better Analytics reporting
    const getPageTitle = (pathname: string) => {
      // Dynamic event pages
      if (pathname.startsWith('/events/')) {
        const eventId = pathname.split('/')[2];
        return `Event Details - ${eventId}`;
      }
      
      // Dynamic member profiles
      if (pathname.startsWith('/member/')) {
        return 'Member Profile';
      }
      
      if (pathname.startsWith('/public-profile/')) {
        return 'Public Profile';
      }
      
      // Static pages
      const pageTitles: Record<string, string> = {
        '/': 'Home',
        '/events': 'Events Directory',
        '/directory': 'Business Directory',
        '/public-directory': 'Community Members',
        '/resources': 'Resources',
        '/dashboard': 'User Dashboard',
        '/login': 'Login',
        '/register': 'Register',
        '/pricing': 'Pricing',
        '/events/suggest': 'Suggest Event',
        '/advertise': 'Advertise',
        '/search': 'Search Results',
      };
      
      return pageTitles[pathname] || pathname;
    };
    
    // Send enhanced pageview with custom page title
    ga.pageviewWithTitle(fullPath, getPageTitle(location.pathname));
    
    // Track specific page categories for better segmentation
    if (location.pathname.startsWith('/events')) {
      ga.event({
        action: 'page_category_view',
        category: 'navigation',
        label: 'events_section',
      });
    } else if (location.pathname.startsWith('/directory') || location.pathname.startsWith('/public-directory')) {
      ga.event({
        action: 'page_category_view',
        category: 'navigation',
        label: 'directory_section',
      });
    } else if (location.pathname.startsWith('/resources')) {
      ga.event({
        action: 'page_category_view',
        category: 'navigation',
        label: 'resources_section',
      });
    }
  }, [location]);

  return {
    trackEvent: ga.event,
    trackUserRegistration: ga.trackUserRegistration,
    trackUserLogin: ga.trackUserLogin,
    trackEventRegistration: ga.trackEventRegistration,
    trackPaymentCompletion: ga.trackPaymentCompletion,
    trackSearch: ga.trackSearch,
    trackSocialClick: ga.trackSocialClick,
    trackFormSubmission: ga.trackFormSubmission,
    trackAdClick: ga.trackAdClick,
    trackError: ga.trackError,
  };
};