import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Transport,
} from 'viem'

// ── QF Network Chain Definition ──
export const qfChain = defineChain({
  id: 42,
  name: 'QuantumFusion',
  nativeCurrency: {
    name: 'QF',
    symbol: 'QF',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ETH_RPC_URL || 'https://archive.mainnet.qfnetwork.xyz/eth'],
    },
  },
  blockExplorers: {
    default: { name: 'QF Portal', url: 'https://portal.qfnetwork.xyz' },
  },
})

// ── Contract Addresses (from env vars only) ──
export const CONTRACT_ADDRESSES = {
  // Registry
  registry: (import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  
  // Pods storage
  podsStorage: (import.meta.env.VITE_PODS_STORAGE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  
  // Pods micro-contracts (write functions)
  podsCreate: (import.meta.env.VITE_PODS_CREATE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsCreatePaid: (import.meta.env.VITE_PODS_CREATE_PAID_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsJoin: (import.meta.env.VITE_PODS_JOIN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsLeave: (import.meta.env.VITE_PODS_LEAVE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsBan: (import.meta.env.VITE_PODS_BAN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsAddMod: (import.meta.env.VITE_PODS_ADDMOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsRemoveMod: (import.meta.env.VITE_PODS_REMOVEMOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsAdmin: (import.meta.env.VITE_PODS_ADMIN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  
  // Pods view contracts
  podsReader: (import.meta.env.VITE_PODS_READER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsGetPod: (import.meta.env.VITE_PODS_GETPOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  
  // Payments
  payments: (import.meta.env.VITE_PAYMENTS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  
  // Messages
  contentStore: (import.meta.env.VITE_CONTENT_STORE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageIndex: (import.meta.env.VITE_MESSAGE_INDEX_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageWriter: (import.meta.env.VITE_MESSAGE_WRITER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageReader: (import.meta.env.VITE_MESSAGE_READER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
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

// ── Wallet Client (writes via EVM provider) ──
let _walletClient: WalletClient | null = null

export async function getWalletClient(explicitProvider?: any): Promise<WalletClient> {
  // Prefer explicit provider, then Talisman EVM, then SubWallet EVM, then MetaMask
  const provider = explicitProvider
    ?? (window as any).talismanEth
    ?? (window as any).SubWallet?.ethereum
    ?? window.ethereum

  if (!provider) {
    throw new Error(
      'No EVM wallet found. Please enable Ethereum accounts in Talisman settings, or install MetaMask.'
    )
  }

  // Request wallet to switch to QF Network (chain ID 42 = 0x2a)
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2a' }],
    })
  } catch (switchError: any) {
    // Chain not added yet — add it
    if (switchError.code === 4902) {
      // Use wallet-specific RPC URL (real URL, not Vite proxy path)
      const walletRpcUrl = import.meta.env.VITE_WALLET_RPC_URL || import.meta.env.VITE_ETH_RPC_URL || 'http://localhost:8545'
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2a',
          chainName: 'QuantumFusion',
          nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
          rpcUrls: [walletRpcUrl],
          blockExplorerUrls: ['https://portal.qfnetwork.xyz'],
        }],
      })
    }
  }

  // Request account access (required by Talisman and other wallets)
  await provider.request({ method: 'eth_requestAccounts' })

  // Create a fresh wallet client with the provider
  _walletClient = createWalletClient({
    chain: qfChain,
    transport: custom(provider),
  })

  return _walletClient
}

// Reset clients (useful on network switch)
export function resetClients(): void {
  _publicClient = null
  _walletClient = null
}
