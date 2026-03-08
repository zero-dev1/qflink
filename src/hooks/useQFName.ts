import { useState, useEffect } from 'react';
import { reverseResolve } from '../lib/qns';

export function useQFName(address: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  
  useEffect(() => {
    if (!address) return;
    reverseResolve(address).then(setName);
  }, [address]);
  
  return name;
}
