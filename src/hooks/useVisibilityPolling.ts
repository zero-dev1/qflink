// src/hooks/useVisibilityPolling.ts
import { useEffect, useRef } from 'react';

/**
 * setInterval that automatically pauses when the tab/window is hidden
 * and resumes (with an immediate fire) when it becomes visible again.
 */
export function useVisibilityPolling(
  callback: () => void,
  intervalMs: number,
  deps: unknown[] = [],
): void {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    function start() {
      stop();
      id = setInterval(() => savedCallback.current(), intervalMs);
    }

    function stop() {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        // Fire immediately on return, then resume interval
        savedCallback.current();
        start();
      }
    }

    // Initial start
    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
