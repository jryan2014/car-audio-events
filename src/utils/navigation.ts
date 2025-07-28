import { NavigateFunction } from 'react-router-dom';

/**
 * Navigate to a route and scroll to a specific element after navigation
 * @param navigate - React Router navigate function
 * @param path - The path to navigate to
 * @param elementId - The ID of the element to scroll to
 * @param delay - Delay in milliseconds before scrolling (default: 100)
 */
export const navigateAndScroll = (
  navigate: NavigateFunction,
  path: string,
  elementId: string,
  delay: number = 100
) => {
  // Validate inputs to prevent injection
  if (typeof path !== 'string' || typeof elementId !== 'string') {
    console.error('Invalid navigation parameters');
    return;
  }
  
  // Sanitize elementId to prevent DOM-based XSS
  const sanitizedId = elementId.replace(/[^a-zA-Z0-9-_]/g, '');
  
  // Ensure delay is within reasonable bounds
  const safeDelay = Math.min(Math.max(delay, 0), 5000);
  
  navigate(path);
  setTimeout(() => {
    const element = document.getElementById(sanitizedId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, safeDelay);
};

/**
 * Scroll to an element on the current page
 * @param elementId - The ID of the element to scroll to
 */
export const scrollToElement = (elementId: string) => {
  // Validate input
  if (typeof elementId !== 'string') {
    console.error('Invalid element ID');
    return;
  }
  
  // Sanitize elementId to prevent DOM-based XSS
  const sanitizedId = elementId.replace(/[^a-zA-Z0-9-_]/g, '');
  
  const element = document.getElementById(sanitizedId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};