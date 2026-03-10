import { useState, useEffect, useCallback } from 'react';
import { reverseResolve, clearNameCache } from '../lib/qns';

interface UseQFNameReturn {
  name: string | null;
  refresh: () => Promise<void>;
}

export function useQFName(address: string | undefined): UseQFNameReturn {
  const [name, setName] = useState<string | null>(null);
  
  const fetchName = useCallback(async () => {
    if (!address) {
      setName(null);
      return;
    }
    const resolved = await reverseResolve(address);
    setName(resolved);
  }, [address]);
  
  useEffect(() => {
    fetchName();
  }, [fetchName]);
  
  const refresh = useCallback(async () => {
    if (!address) return;
    // Clear cache for this address and re-fetch
    clearNameCache(address);
    await fetchName();
  }, [address, fetchName]);
  
  return { name, refresh };
}
