import { ApiPromise, WsProvider } from '@polkadot/api'
import { u8aToHex, hexToU8a } from '@polkadot/util'
import { keccak256AsU8a, decodeAddress } from '@polkadot/util-crypto'
import { getNetwork, setNetwork, isBlockStale, type NetworkId } from './network'
import { useNetworkStore } from '@/stores/network'

export interface InjectedAccountWithMeta {
  address: string
  meta?: {
    name?: string
    source: string
  }
  signer?: any
}

let api: ApiPromise | null = null
let provider: WsProvider | null = null
let currentWsUrl: string | null = null
let healthInterval: ReturnType<typeof setInterval> | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let blockUnsub: (() => void) | null = null

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAY_MS = 5_000
const HEALTH_CHECK_INTERVAL_MS = 15_000
const REVIVE_API_POLL_INTERVAL_MS = 200
const REVIVE_API_MAX_WAIT_MS = 10_000

function store() {
  return useNetworkStore.getState()
}

function cleanupHealthCheck() {
  if (healthInterval) { clearInterval(healthInterval); healthInterval = null }
  if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null }
  if (blockUnsub) { blockUnsub(); blockUnsub = null }
}

/**
 * Subscribe to new block headers and update the network store.
 */
async function startBlockSubscription(chainApi: ApiPromise) {
  if (blockUnsub) { blockUnsub(); blockUnsub = null }
  try {
    const unsub = await chainApi.rpc.chain.subscribeNewHeads((header) => {
      const blockNum = header.number.toNumber()
      store().setBlockInfo(blockNum, Date.now())
    })
    blockUnsub = unsub as unknown as () => void
  } catch {
    // non-fatal
  }
}

/**
 * Periodically check if blocks are stale.
 */
function startHealthCheck() {
  if (healthInterval) clearInterval(healthInterval)
  healthInterval = setInterval(() => {
    const { latestBlockTime, connectionStatus } = store()
    if (connectionStatus === 'connected' && latestBlockTime > 0) {
      if (isBlockStale(latestBlockTime)) {
        store().setConnectionStatus('stalled')
        store().setHealthy(false)
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS)
}

/**
 * Attempt reconnection with retry logic.
 */
async function attemptReconnect(): Promise<void> {
  const { reconnectAttempts } = store()
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    store().setConnectionStatus('disconnected')
    return
  }
  store().incrementReconnectAttempts()
  reconnectTimeout = setTimeout(async () => {
    try {
      await getApi()
    } catch {
      await attemptReconnect()
    }
  }, RECONNECT_DELAY_MS)
}

/**
 * Wait for the reviveApi runtime API to become available.
 * Polls every 200ms for up to 10 seconds.
 */
async function waitForReviveApi(chainApi: ApiPromise): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < REVIVE_API_MAX_WAIT_MS) {
    try {
      // Check if api.call.reviveApi.call exists and is callable
      if (chainApi.call && (chainApi.call as any).reviveApi && typeof (chainApi.call as any).reviveApi.call === 'function') {
        console.log('✅ [waitForReviveApi] reviveApi.call is available')
        return
      }
    } catch {
      // Continue polling
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, REVIVE_API_POLL_INTERVAL_MS))
  }
  
  console.warn('⚠️ [waitForReviveApi] Timeout waiting for reviveApi - proceeding anyway')
}

/**
 * Get or create a singleton ApiPromise connected to the current network.
 * Reconnects automatically if the network has changed.
 * Waits for reviveApi to be available before resolving.
 */
export async function getApi(): Promise<ApiPromise> {
  const network = getNetwork()

  if (api && api.isConnected && currentWsUrl === network.wsUrl) {
    return api
  }

  // Disconnect previous connection if switching networks
  if (api) {
    cleanupHealthCheck()
    try { await api.disconnect() } catch { /* ignore */ }
    api = null
    provider = null
  }

  store().setConnectionStatus('connecting')
  currentWsUrl = network.wsUrl

  try {
    provider = new WsProvider(network.wsUrl)
    api = await ApiPromise.create({ provider, noInitWarn: true })

    store().setConnectionStatus('connected')
    store().resetReconnectAttempts()

    // Listen for disconnect events
    api.on('disconnected', () => {
      store().setConnectionStatus('disconnected')
      store().setHealthy(false)
      attemptReconnect()
    })
    api.on('connected', () => {
      store().setConnectionStatus('connected')
      store().resetReconnectAttempts()
    })

    await startBlockSubscription(api)
    startHealthCheck()

    // Wait for reviveApi to be fully available before returning
    await waitForReviveApi(api)

    return api
  } catch (err) {
    store().setConnectionStatus('disconnected')
    throw err
  }
}

/**
 * Disconnect the current API connection.
 */
export async function disconnectApi(): Promise<void> {
  cleanupHealthCheck()
  if (api) {
    try { await api.disconnect() } catch { /* ignore */ }
    api = null
    provider = null
    currentWsUrl = null
  }
  store().setConnectionStatus('disconnected')
  store().setHealthy(false)
}

/**
 * Query the free balance for an address. Falls back to 0 on error.
 */
export async function queryBalance(address: string): Promise<bigint> {
  try {
    const chainApi = await getApi()
    const { data } = await chainApi.query.system.account(address) as any
    return BigInt(data.free.toString())
  } catch (err) {
    console.warn('Failed to query balance:', err)
    return BigInt(0)
  }
}

/**
 * Subscribe to balance changes for an address.
 * Returns an unsubscribe function.
 */
export async function subscribeBalance(
  address: string,
  callback: (free: bigint) => void
): Promise<() => void> {
  try {
    const chainApi = await getApi()
    const unsub = await chainApi.query.system.account(address, (info: any) => {
      callback(BigInt(info.data.free.toString()))
    })
    return unsub as unknown as () => void
  } catch (err) {
    console.warn('Failed to subscribe to balance:', err)
    return () => {}
  }
}

/**
 * Get chain metadata (name, version).
 */
export async function getChainInfo(): Promise<{ name: string; version: string }> {
  try {
    const chainApi = await getApi()
    const [chain, version] = await Promise.all([
      chainApi.rpc.system.chain(),
      chainApi.rpc.system.version(),
    ])
    return { name: chain.toString(), version: version.toString() }
  } catch {
    const network = getNetwork()
    return { name: network.name, version: 'unknown' }
  }
}

/**
 * Check if the API is currently connected.
 */
export function isConnected(): boolean {
  return api !== null && api.isConnected
}

/**
 * Switch to a different network. Disconnects current and reconnects.
 */
export async function switchNetwork(networkId: NetworkId): Promise<ApiPromise> {
  setNetwork(networkId)
  store().setCurrentNetwork(networkId)
  cleanupHealthCheck()
  if (api) {
    try { await api.disconnect() } catch { /* ignore */ }
    api = null
    provider = null
    currentWsUrl = null
  }
  return getApi()
}

export async function ensureAccountMapped(
  account: InjectedAccountWithMeta
): Promise<string> {
  const chainApi = await getApi()
  
  const entries = await chainApi.query.revive.originalAccount.entries()
  const mapped = entries.find(([key, value]) => {
    const accountId = value.toString()
    return accountId === account.address
  })
  
  if (mapped) {
    const evmAddress = mapped[0].args[0].toString()
    return evmAddress
  }
  
  return new Promise((resolve, reject) => {
    chainApi.tx.revive
      .mapAccount()
      .signAndSend(account.address, { signer: account.signer }, async (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          try {
            const entries = await chainApi.query.revive.originalAccount.entries()
            const newMapping = entries.find(([key, value]) => {
              return value.toString() === account.address
            })
            if (newMapping) {
              const evmAddress = newMapping[0].args[0].toString()
              resolve(evmAddress)
            } else {
              reject(new Error('Mapping not found after transaction'))
            }
          } catch (err) {
            reject(err)
          }
        }
        if (result.isError) {
          reject(new Error('Account mapping failed'))
        }
      })
      .catch(reject)
  })
}

export async function getEvmAddress(substrateAddress: string): Promise<string | null> {
  try {
    const chainApi = await getApi()
    const entries = await chainApi.query.revive.originalAccount.entries()
    const mapped = entries.find(([key, value]) => {
      return value.toString() === substrateAddress
    })
    if (mapped) {
      return mapped[0].args[0].toString()
    }
    return null
  } catch {
    return null
  }
}

export async function subscribeContractEvents(
  callback: (event: any) => void
): Promise<() => void> {
  try {
    const chainApi = await getApi()
    const unsub = await chainApi.query.system.events((events: any) => {
      events.forEach((record: any) => {
        const { event } = record
        if (event.section === 'revive' && event.method === 'ContractEmitted') {
          callback(event)
        }
      })
    })
    return unsub as unknown as () => void
  } catch (err) {
    console.warn('Failed to subscribe to contract events:', err)
    return () => {}
  }
}

/**
 * Derive EVM address from Substrate address using keccak256 (same as pallet-revive)
 * pallet-revive hashes the 32-byte AccountId and takes the last 20 bytes
 */
export function deriveEvmAddress(substrateAddress: string): string {
  try {
    // Decode SS58 address to 32-byte AccountId
    const accountId = decodeAddress(substrateAddress)
    // Hash with keccak256
    const hash = keccak256AsU8a(accountId)
    // Take last 20 bytes and prefix with 0x
    const evmAddress = '0x' + u8aToHex(hash.slice(-20)).slice(2)
    return evmAddress.toLowerCase()
  } catch {
    return ''
  }
}
