/**
 * Site-wide focus and scroll utilities for better UX
 */

export interface ScrollToOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  delay?: number;
}

export interface FocusOptions {
  delay?: number;
  preventScroll?: boolean;
}

/**
 * Scrolls to an element with improved defaults and error handling
 */
export const scrollToElement = (
  element: HTMLElement | null,
  options: ScrollToOptions = {}
): void => {
  if (!element) return;

  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    delay = 100
  } = options;

  const performScroll = () => {
    try {
      element.scrollIntoView({
        behavior,
        block,
        inline
      });
    } catch (error) {
      console.warn('ScrollIntoView failed, using fallback:', error);
      // Fallback for older browsers
      element.scrollIntoView(true);
    }
  };

  if (delay > 0) {
    setTimeout(performScroll, delay);
  } else {
    performScroll();
  }
};

/**
 * Focuses an element with improved defaults and error handling
 */
export const focusElement = (
  element: HTMLElement | null,
  options: FocusOptions = {}
): void => {
  if (!element) return;

  const {
    delay = 100,
    preventScroll = false
  } = options;

  const performFocus = () => {
    try {
      if ('focus' in element && typeof element.focus === 'function') {
        element.focus({ preventScroll });
      }
    } catch (error) {
      console.warn('Focus failed:', error);
    }
  };

  if (delay > 0) {
    setTimeout(performFocus, delay);
  } else {
    performFocus();
  }
};

/**
 * Scrolls to an element using a ref with improved defaults
 */
export const scrollToRef = (
  ref: React.RefObject<HTMLElement>,
  options: ScrollToOptions = {}
): void => {
  scrollToElement(ref.current, options);
};

/**
 * Focuses an element using a ref with improved defaults
 */
export const focusRef = (
  ref: React.RefObject<HTMLElement>,
  options: FocusOptions = {}
): void => {
  focusElement(ref.current, options);
};

/**
 * Combined scroll and focus for form elements
 */
export const scrollToAndFocusElement = (
  element: HTMLElement | null,
  scrollOptions: ScrollToOptions = {},
  focusOptions: FocusOptions = {}
): void => {
  if (!element) return;

  // Scroll first
  scrollToElement(element, scrollOptions);
  
  // Focus after scroll completes
  const focusDelay = (scrollOptions.delay || 100) + 200;
  focusElement(element, { ...focusOptions, delay: focusDelay });
};

/**
 * Combined scroll and focus using refs
 */
export const scrollToAndFocusRef = (
  ref: React.RefObject<HTMLElement>,
  scrollOptions: ScrollToOptions = {},
  focusOptions: FocusOptions = {}
): void => {
  scrollToAndFocusElement(ref.current, scrollOptions, focusOptions);
};

/**
 * Scroll to top of page with smooth behavior
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth'): void => {
  try {
    window.scrollTo({ top: 0, behavior });
  } catch (error) {
    console.warn('ScrollTo failed, using fallback:', error);
    window.scrollTo(0, 0);
  }
};

/**
 * Auto-scroll to form when it becomes visible
 * Useful for forms that are conditionally rendered
 */
export const useAutoScrollToForm = (
  ref: React.RefObject<HTMLElement>,
  isVisible: boolean,
  options: ScrollToOptions = {}
): void => {
  React.useEffect(() => {
    if (isVisible && ref.current) {
      scrollToRef(ref, options);
    }
  }, [isVisible, ref, options]);
};

/**
 * Auto-focus first input in a form when it becomes visible
 */
export const useAutoFocusFirstInput = (
  containerRef: React.RefObject<HTMLElement>,
  isVisible: boolean,
  options: FocusOptions = {}
): void => {
  React.useEffect(() => {
    if (isVisible && containerRef.current) {
      const firstInput = containerRef.current.querySelector(
        'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])'
      ) as HTMLElement;
      
      if (firstInput) {
        focusElement(firstInput, { delay: 200, ...options });
      }
    }
  }, [isVisible, containerRef, options]);
};

// Re-export React for the hooks
import React from 'react'; 