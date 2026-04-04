export type NetworkId = 'local' | 'testnet' | 'mainnet'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'stalled'

export interface NetworkConfig {
  id: NetworkId
  name: string
  wsUrl: string
  explorerUrl: string
  faucetUrl?: string
  tokenSymbol: string
  tokenDecimals: number
  description?: string
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  local: {
    id: 'local',
    name: 'Local Dev',
    wsUrl: 'ws://127.0.0.1:9944',
    explorerUrl: 'https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer',
    tokenSymbol: 'QF',
    tokenDecimals: 18,
    description: 'Run qf-node --dev locally',
  },
  testnet: {
    id: 'testnet',
    name: 'QF Testnet',
    wsUrl: 'wss://test.qfnetwork.xyz',
    explorerUrl: 'https://portal.qfnetwork.xyz/#/explorer',
    faucetUrl: 'https://faucet.qfnetwork.xyz',
    tokenSymbol: 'QF',
    tokenDecimals: 18,
    description: 'May be paused/unavailable at times',
  },
  mainnet: {
    id: 'mainnet',
    name: 'QF Mainnet',
    wsUrl: 'wss://mainnet.qfnode.net',
    explorerUrl: 'https://portal.qfnetwork.xyz/#/explorer',
    tokenSymbol: 'QF',
    tokenDecimals: 18,
    description: 'Real tokens, real transactions',
  },
}

export const DEV_MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

export const DEV_ACCOUNTS = [
  { name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', derivation: '//Alice', role: 'bank' },
  { name: 'Bob', address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', derivation: '//Bob', role: 'whale' },
  { name: 'Charlie', address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', derivation: '//Charlie', role: 'dolphin' },
  { name: 'Dave', address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', derivation: '//Dave', role: 'shrimp' },
  { name: 'Eve', address: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw', derivation: '//Eve', role: 'plankton' },
  { name: 'Ferdie', address: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSneWj6VRmhv', derivation: '//Ferdie', role: 'broke' },
] as const

export const NETWORK_ORDER: NetworkId[] = ['local', 'testnet', 'mainnet']

const STALE_BLOCK_THRESHOLD_MS = 60_000

const DEFAULT_NETWORK: NetworkId =
  (import.meta.env.VITE_DEFAULT_NETWORK as NetworkId) || 'local'

let currentNetwork: NetworkId = DEFAULT_NETWORK

export function getNetwork(): NetworkConfig {
  return NETWORKS[currentNetwork]
}

export function getNetworkId(): NetworkId {
  return currentNetwork
}

export function setNetwork(id: NetworkId): NetworkConfig {
  currentNetwork = id
  return NETWORKS[id]
}

export function isBlockStale(blockTimestampMs: number): boolean {
  return Date.now() - blockTimestampMs > STALE_BLOCK_THRESHOLD_MS
}
