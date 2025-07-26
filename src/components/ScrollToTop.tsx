import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    // Use a small timeout to ensure the DOM has updated
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior
      });
      
      // Also try to focus on the main content area
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      
      // Handle any scrollable containers
      const scrollableContainers = document.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]');
      scrollableContainers.forEach(container => {
        container.scrollTop = 0;
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}