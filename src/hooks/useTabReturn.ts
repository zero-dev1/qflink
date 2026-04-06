// src/hooks/useTabReturn.ts
// §24 — Tab return: immediate data fetch + subtle opacity breath (0.97→1.0, 200ms)
import { useEffect, useRef, useState } from 'react';

/**
 * Detects when the user returns to the tab and provides a CSS class
 * for the brief opacity breath animation. Also calls an optional
 * onReturn callback for data fetching.
 */
export function useTabReturn(onReturn?: () => void) {
  const [breathing, setBreathing] = useState(false);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) {
        // Tab just became visible — trigger breath
        setBreathing(true);
        onReturnRef.current?.();
        // Remove class after animation completes
        const timer = setTimeout(() => setBreathing(false), 250);
        return () => clearTimeout(timer);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return breathing ? 'animate-opacity-breath' : '';
}
