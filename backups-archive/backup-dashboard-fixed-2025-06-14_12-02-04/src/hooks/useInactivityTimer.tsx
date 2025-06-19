import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityTimerProps {
  timeout?: number; // in milliseconds
  onTimeout: () => void;
  isActive?: boolean;
}

export const useInactivityTimer = ({ 
  timeout = 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  onTimeout,
  isActive = true 
}: UseInactivityTimerProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(isActive);

  // Update the ref when isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const resetTimer = useCallback(() => {
    if (!isActiveRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        onTimeout();
      }
    }, timeout);
  }, [timeout, onTimeout]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      clearTimer();
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Reset timer on any user activity
    const resetOnActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetOnActivity, true);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimer();
      events.forEach(event => {
        document.removeEventListener(event, resetOnActivity, true);
      });
    };
  }, [isActive, resetTimer, clearTimer]);

  return { resetTimer, clearTimer };
}; 