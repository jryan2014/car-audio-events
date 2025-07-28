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
  navigate(path);
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, delay);
};

/**
 * Scroll to an element on the current page
 * @param elementId - The ID of the element to scroll to
 */
export const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};