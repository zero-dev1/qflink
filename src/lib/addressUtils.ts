import { keccak256, toBytes } from 'viem'

/**
 * Detect if an address is Substrate (starts with 5, length ~48) or EVM (starts with 0x, length 42)
 */
export function detectAddressFormat(address: string): 'substrate' | 'evm' {
  if (address.startsWith('0x') && address.length === 42) return 'evm'
  return 'substrate'
}

/**
 * Convert Substrate public key to EVM address (client-side derivation).
 * This matches pallet-revive's AccountId32Mapper logic:
 * Take keccak256 of the 32-byte public key, use last 20 bytes as EVM address.
 */
export function substrateToEvm(substratePubKey: Uint8Array): `0x${string}` {
  const hash = keccak256(substratePubKey)
  return `0x${hash.slice(-40)}` as `0x${string}`
}

/**
 * Normalize any address to lowercase 0x format.
 * If it's already an EVM address, just lowercase it.
 * Substrate addresses need mapping via the chain — this only handles EVM addresses.
 */
export function normalizeEvmAddress(address: string): `0x${string}` {
  return address.toLowerCase() as `0x${string}`
}
