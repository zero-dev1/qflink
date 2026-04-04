import { namehash } from "viem/ens";
import { callContract } from "./contractHelpers";
import { CONTRACT_ADDRESSES } from "./contracts";

const resolverABI = [
  { name: "addr", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "string" }] },
  { name: "text", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }], outputs: [{ name: "", type: "string" }] },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const nameCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function clearNameCache(address: string): void {
  nameCache.delete(address.toLowerCase());
}

export async function resolveQFName(name: string): Promise<string | null> {
  if (!name.endsWith(".qf") || !CONTRACT_ADDRESSES.qnsResolver || CONTRACT_ADDRESSES.qnsResolver === ZERO_ADDRESS) return null;
  const node = namehash(name);
  try {
    const addr = await callContract(CONTRACT_ADDRESSES.qnsResolver, [...resolverABI], "addr", [node]);
    return addr === ZERO_ADDRESS ? null : addr as string;
  } catch { return null; }
}

export async function reverseResolve(address: string): Promise<string | null> {
  if (!CONTRACT_ADDRESSES.qnsResolver || CONTRACT_ADDRESSES.qnsResolver === ZERO_ADDRESS) return null;
  const lower = address.toLowerCase();
  const cached = nameCache.get(lower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.name;
  const reverseNode = namehash(`${lower.slice(2)}.reverse`);
  try {
    const name = await callContract(CONTRACT_ADDRESSES.qnsResolver, [...resolverABI], "name", [reverseNode]) as string;
    const result = name || null;
    nameCache.set(lower, { name: result, timestamp: Date.now() });
    return result;
  } catch {
    nameCache.set(lower, { name: null, timestamp: Date.now() });
    return null;
  }
}

export function isQFName(input: string): boolean {
  return input.endsWith(".qf") && input.length > 3;
}

export function normalizeQFName(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("0x")) return null;
  if (trimmed.endsWith(".qf")) return trimmed;
  return `${trimmed}.qf`;
}

export function formatAddress(address: string, qfName?: string | null): string {
  if (qfName) return qfName;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
