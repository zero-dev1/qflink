import { namehash } from 'viem/ens';
import { getPublicClient } from './viemClient';

// QNS Resolver address — update after each deploy
const QNS_RESOLVER_ADDRESS = (import.meta.env.VITE_QNS_RESOLVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

const resolverABI = [
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Cache: address → name, with TTL
const nameCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Clear cache for a specific address (used after name registration)
export function clearNameCache(address: string): void {
  nameCache.delete(address.toLowerCase());
}

// Resolve .qf name → address
export async function resolveQFName(name: string): Promise<string | null> {
  if (!name.endsWith('.qf')) return null;
  const node = namehash(name);
  try {
    const publicClient = getPublicClient();
    const addr = await publicClient.readContract({
      address: QNS_RESOLVER_ADDRESS,
      abi: resolverABI,
      functionName: 'addr',
      args: [node],
    });
    return addr === ZERO_ADDRESS ? null : addr;
  } catch {
    return null;
  }
}

// Reverse resolve address → .qf name (with cache)
export async function reverseResolve(address: string): Promise<string | null> {
  const lower = address.toLowerCase();
  const cached = nameCache.get(lower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  const reverseNode = namehash(`${lower.slice(2)}.reverse`);
  try {
    const publicClient = getPublicClient();
    const name = await publicClient.readContract({
      address: QNS_RESOLVER_ADDRESS,
      abi: resolverABI,
      functionName: 'name',
      args: [reverseNode],
    });
    const result = name || null;
    nameCache.set(lower, { name: result, timestamp: Date.now() });
    return result;
  } catch {
    nameCache.set(lower, { name: null, timestamp: Date.now() });
    return null;
  }
}

// Check if input is a .qf name
export function isQFName(input: string): boolean {
  return input.endsWith('.qf') && input.length > 3;
}

// Format display: show .qf name if available, otherwise truncated address
export function formatAddress(address: string, qfName?: string | null): string {
  if (qfName) return qfName;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
