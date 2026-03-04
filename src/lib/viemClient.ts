import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Transport,
} from 'viem'

// ── QF Network Chain Definition ──
export const qfChain: Chain = {
  id: 42,
  name: 'QuantumFusion',
  nativeCurrency: {
    name: 'QF',
    symbol: 'QF',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ETH_RPC_URL || 'https://archive.mainnet.qfnode.net/eth'],
    },
  },
}

// ── Contract Addresses (from env vars only) ──
export const CONTRACT_ADDRESSES = {
  registry: (import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  pods: (import.meta.env.VITE_PODS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messages: (import.meta.env.VITE_MESSAGES_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const

// ── Public Client (reads) ──
let _publicClient: PublicClient | null = null

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: qfChain,
      transport: http(qfChain.rpcUrls.default.http[0]),
    })
  }
  return _publicClient
}

// ── Wallet Client (writes via MetaMask / EIP-1193) ──
let _walletClient: WalletClient | null = null

export function getWalletClient(): WalletClient {
  if (!window.ethereum) {
    throw new Error('No EIP-1193 provider found (MetaMask not installed)')
  }

  if (!_walletClient) {
    _walletClient = createWalletClient({
      chain: qfChain,
      transport: custom(window.ethereum),
    })
  }
  return _walletClient
}

// Reset clients (useful on network switch)
export function resetClients(): void {
  _publicClient = null
  _walletClient = null
}
