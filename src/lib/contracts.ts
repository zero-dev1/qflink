import type { ApiPromise } from '@polkadot/api'
import { u8aToHex, hexToU8a } from '@polkadot/util'
import { keccak256AsU8a } from '@polkadot/util-crypto'
import { getApi, type InjectedAccountWithMeta } from './chain'

export const CONTRACT_ADDRESSES = {
  registry: import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  pods: import.meta.env.VITE_PODS_ADDRESS || '0x0000000000000000000000000000000000000000',
  messages: import.meta.env.VITE_MESSAGES_ADDRESS || '0x0000000000000000000000000000000000000000',
}

// ============ QUERY CACHE ============
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10000 // 10 seconds

function getCached(key: string): any | null {
  const entry = queryCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data
  return null
}

function setCache(key: string, data: any): void {
  queryCache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    queryCache.clear()
    return
  }
  for (const key of queryCache.keys()) {
    if (key.startsWith(keyPrefix)) queryCache.delete(key)
  }
}

const DECIMALS_18 = BigInt(10) ** BigInt(18)
const DEFAULT_GAS_LIMIT = { refTime: BigInt(10000000000), proofSize: BigInt(10000000000) }
const BATCH_GAS_LIMIT = { refTime: BigInt(1000000000), proofSize: BigInt(1000000000) }
const DEFAULT_STORAGE_DEPOSIT = (BigInt(10) ** BigInt(18)).toString()
const MAX_BATCH_CHUNKS = 3

function selector(signature: string): Uint8Array {
  const hash = keccak256AsU8a(new TextEncoder().encode(signature))
  return hash.slice(0, 4)
}

function encodeU32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  for (let i = 0; i < 4; i++) {
    bytes[i] = (value >> (i * 8)) & 0xff
  }
  return bytes
}

function encodeU64(value: number | bigint): Uint8Array {
  const bn = BigInt(value)
  const bytes = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number((bn >> BigInt(i * 8)) & BigInt(0xff))
  }
  return bytes
}

function encodeU256(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff))
  }
  return bytes
}

function encodeBytes(data: Uint8Array): Uint8Array {
  const len = data.length
  let lenBytes: Uint8Array
  if (len < 64) {
    lenBytes = new Uint8Array([len << 2])
  } else if (len < 16384) {
    lenBytes = new Uint8Array([(len << 2) | 1, len >> 6])
  } else {
    lenBytes = new Uint8Array([(len << 2) | 2, len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff])
  }
  const result = new Uint8Array(lenBytes.length + data.length)
  result.set(lenBytes, 0)
  result.set(data, lenBytes.length)
  return result
}

function encodeString(str: string): Uint8Array {
  return encodeBytes(new TextEncoder().encode(str))
}

function encodeAddress(addr: string): Uint8Array {
  if (addr.startsWith('0x')) {
    return hexToU8a(addr.padEnd(42, '0'))
  }
  return hexToU8a('0x' + addr.padEnd(40, '0'))
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

export async function callContract(
  api: ApiPromise,
  contractAddress: string,
  callData: Uint8Array,
  signer: InjectedAccountWithMeta,
  value: bigint = BigInt(0)
): Promise<any> {
  return new Promise((resolve, reject) => {
    api.tx.revive
      .call(
        contractAddress,
        value.toString(),
        DEFAULT_GAS_LIMIT,
        DEFAULT_STORAGE_DEPOSIT,
        u8aToHex(callData)
      )
      .signAndSend(signer.address, { signer: signer.signer }, (result) => {
        if (result.isError) {
          reject(new Error('Transaction failed'))
          return
        }
        if (result.status.isInBlock || result.status.isFinalized) {
          // Check for dispatch errors (e.g. 1010 Inability to pay)
          const dispatchError = (result as any).dispatchError
          if (dispatchError) {
            let errMsg = 'Transaction failed'
            try {
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule)
                errMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
              } else {
                errMsg = dispatchError.toString()
              }
            } catch {
              errMsg = dispatchError.toString()
            }
            reject(new Error(errMsg))
            return
          }
          resolve(result)
        }
      })
      .catch((err: any) => {
        // Surface the raw error string (e.g. "1010: Invalid Transaction: Inability to pay...")
        const msg = err?.message || String(err) || 'Transaction failed'
        reject(new Error(msg))
      })
  })
}

/**
 * Send a contract transaction via MetaMask (EVM wallet).
 * Uses eth_sendTransaction JSON-RPC method.
 */
async function sendContractTxEvm(
  contractAddress: string,
  callData: Uint8Array,
  value: bigint = BigInt(0)
): Promise<any> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const from = window.ethereum.selectedAddress
  if (!from) {
    throw new Error('MetaMask not connected')
  }

  // Convert callData to hex
  const data = '0x' + Array.from(callData)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Estimate gas using eth_estimateGas
  let gasLimit: string
  const ethRpcUrl = import.meta.env.VITE_ETH_RPC_URL
  
  if (ethRpcUrl) {
    try {
      const estimateResponse = await fetch(ethRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateGas',
          params: [{
            from,
            to: contractAddress,
            data,
            value: '0x' + value.toString(16),
          }],
        }),
      })
      const estimateData = await estimateResponse.json()
      if (estimateData.result) {
        // Add 20% buffer to estimated gas
        const estimatedGas = BigInt(estimateData.result)
        const bufferedGas = (estimatedGas * BigInt(120)) / BigInt(100)
        gasLimit = '0x' + bufferedGas.toString(16)
      } else {
        throw new Error('Gas estimation failed: ' + (estimateData.error?.message || 'Unknown error'))
      }
    } catch (err) {
      gasLimit = '0x5B8D80' // 6M gas fallback
    }
  } else {
    // No RPC URL available, use default gas
    gasLimit = '0x5B8D80' // 6M gas
  }

  // Send transaction via MetaMask
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: contractAddress,
      data,
      value: '0x' + value.toString(16),
      gas: gasLimit,
    }],
  })

  // Wait for transaction receipt by polling (reuse ethRpcUrl from gas estimation)
  if (!ethRpcUrl) {
    // If no RPC URL, just return the hash
    return { txHash, status: { isFinalized: true } }
  }

  // Poll for receipt
  for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      const response = await fetch(ethRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        }),
      })
      const data = await response.json()
      if (data.result) {
        return { 
          txHash, 
          receipt: data.result,
          status: { isFinalized: true, isInBlock: true }
        }
      }
    } catch (err) {
      // Continue polling
    }
  }

  // Timeout - return anyway
  return { txHash, status: { isFinalized: false } }
}

/**
 * Send a contract transaction using the appropriate wallet method.
 * Checks walletType from the store and routes to Substrate or EVM implementation.
 */
export async function sendContractTx(
  api: ApiPromise,
  contractAddress: string,
  callData: Uint8Array,
  value: bigint = BigInt(0)
): Promise<any> {
  const { useWalletStore } = await import('@/stores/wallet')
  const { walletType, walletSource, address } = useWalletStore.getState()

  if (walletType === 'evm') {
    // Use MetaMask for EVM wallets
    return sendContractTxEvm(contractAddress, callData, value)
  } else {
    // Use Substrate signer
    if (!walletSource || !address) {
      throw new Error('Wallet not connected')
    }
    
    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    
    const account: InjectedAccountWithMeta = {
      address,
      meta: { source: walletSource },
      signer: injector.signer,
    }
    
    return callContract(api, contractAddress, callData, account, value)
  }
}

// Helper to calculate contract storage keys (matches the contract's storage_key function)
function contractStorageKey(prefix: string, parts: Uint8Array[]): Uint8Array {
  const input: number[] = []
  
  // Add prefix
  const prefixBytes = new TextEncoder().encode(prefix)
  input.push(...prefixBytes)
  
  // Add parts
  for (const part of parts) {
    input.push(...part)
  }
  
  // Hash with keccak256
  return keccak256AsU8a(new Uint8Array(input))
}

export async function queryContract(
  api: ApiPromise,
  contractAddress: string,
  callData: Uint8Array,
  caller: string = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' // Alice's address - always mapped on dev node
): Promise<Uint8Array> {
  // Verify reviveApi is available before proceeding
  if (!api.call || !(api.call as any).reviveApi || typeof (api.call as any).reviveApi.call !== 'function') {
    api = await getApi()
  }
  
  // Get the Substrate address for the origin (must be 32-byte AccountId32, not 20-byte EVM address)
  let origin = caller
  
  // Try to get the connected wallet's Substrate address
  try {
    const { useWalletStore } = await import('@/stores/wallet')
    const walletAddress = useWalletStore.getState().address
    if (walletAddress) {
      origin = walletAddress
    }
  } catch {
    // Use default origin
  }
  
  try {
    // Use the correct runtime API: api.call.reviveApi.call()
    // Parameters: (origin: AccountId32, dest: H160, value, gasLimit, storageDepositLimit, inputData)
    const response = await (api.call as any).reviveApi.call(
      origin, // 32-byte Substrate address
      contractAddress, // 20-byte EVM contract address
      '0', // value
      null, // gasLimit (None = use default)
      null, // storageDepositLimit (None = use default)
      u8aToHex(callData)
    )
    
    // Extract the result from the response
    const result = (response as any).result
    
    // Try Rust-style enum access (isOk/asOk)
    if (result && typeof result.isOk === 'boolean') {
      if (result.isOk) {
        const execResult = result.asOk
        
        // Check REVERT flag (bit 0 of flags) — contract returned an error
        const flags = execResult.flags
        if (flags) {
          const flagsNum = typeof flags.toNumber === 'function' ? flags.toNumber() : Number(flags)
          if (flagsNum & 1) {
            // Contract reverted — return empty (not valid data)
            return new Uint8Array(0)
          }
        }
        
        const data = execResult.data
        
        // Handle different data types
        if (data instanceof Uint8Array) {
          // Check if response is "Unknown function" error
          if (data.length === 16) {
            const text = new TextDecoder().decode(data)
            if (text === 'Unknown function') {
              return new Uint8Array(0)
            }
          }
          return data
        } else if (typeof data === 'string') {
          return hexToU8a(data)
        } else if (data && typeof (data as any).toU8a === 'function') {
          return (data as any).toU8a(true)
        }
        return new Uint8Array(0)
      } else {
        return new Uint8Array(0)
      }
    }
    
    // Try JSON structure access
    const resultJson = result?.toJSON ? result.toJSON() : result
    
    // Check REVERT flag in JSON path too
    if (resultJson?.Ok?.flags && (Number(resultJson.Ok.flags) & 1)) {
      return new Uint8Array(0)
    }
    
    if (resultJson?.Ok?.data) {
      const data = resultJson.Ok.data
      if (data instanceof Uint8Array) {
        return data
      } else if (typeof data === 'string') {
        return hexToU8a(data)
      }
    }
    if (resultJson?.data) {
      const data = resultJson.data
      if (data instanceof Uint8Array) {
        return data
      } else if (typeof data === 'string') {
        return hexToU8a(data)
      }
    }
    
    return new Uint8Array(0)
    
  } catch (err) {
    console.error('[queryContract] Runtime API call failed:', err)
    return new Uint8Array(0)
  }
}

function decodeU64(data: Uint8Array, offset: number = 0): bigint {
  let result = BigInt(0)
  for (let i = 0; i < 8; i++) {
    const byte = data[offset + i]
    if (byte === undefined) break
    result |= BigInt(byte) << BigInt(i * 8)
  }
  return result
}

function decodeU32(data: Uint8Array, offset: number = 0): number {
  let result = 0
  for (let i = 0; i < 4; i++) {
    result |= data[offset + i] << (i * 8)
  }
  return result
}

function decodeU256(data: Uint8Array, offset: number = 0): bigint {
  let result = BigInt(0)
  for (let i = 0; i < 32; i++) {
    const byte = data[offset + i]
    if (byte === undefined) break
    result |= BigInt(byte) << BigInt(i * 8)
  }
  return result
}

function decodeCompactLength(data: Uint8Array, offset: number = 0): { length: number; bytesRead: number } {
  const first = data[offset]
  const mode = first & 0x03
  if (mode === 0) {
    return { length: first >> 2, bytesRead: 1 }
  } else if (mode === 1) {
    return { length: ((first >> 2) | (data[offset + 1] << 6)), bytesRead: 2 }
  } else {
    const len = (first >> 2) | (data[offset + 1] << 6) | (data[offset + 2] << 14) | (data[offset + 3] << 22)
    return { length: len, bytesRead: 4 }
  }
}

function decodeBytes(data: Uint8Array, offset: number = 0): { bytes: Uint8Array; bytesRead: number } {
  const { length, bytesRead } = decodeCompactLength(data, offset)
  const bytes = data.slice(offset + bytesRead, offset + bytesRead + length)
  return { bytes, bytesRead: bytesRead + length }
}

function decodeString(data: Uint8Array, offset: number = 0): { str: string; bytesRead: number } {
  const { bytes, bytesRead } = decodeBytes(data, offset)
  return { str: new TextDecoder().decode(bytes), bytesRead }
}

function decodeAddress(data: Uint8Array, offset: number = 0): string {
  return u8aToHex(data.slice(offset, offset + 20))
}

export interface UserProfile {
  displayName: string
  encryptionPubkey: Uint8Array
  registeredAt: bigint
}

export interface Pod {
  id: bigint
  name: string
  description: string
  minBalance: bigint
  creator: string
  createdAt: bigint
  isDefault: boolean
  podType: number
  tier?: number  // 0=Free, 1=Pro
  entryFee?: bigint
  payoutWallet?: string
  memberCount?: number
}

export interface PodMessage {
  id: string
  podId: number
  sender: string
  contentHash: Uint8Array
  timestamp: number
  content: string
}

export interface DirectMessage {
  sender: string
  recipient: string
  contentHash: Uint8Array
  timestamp: number
  nonce: Uint8Array
  content?: string
}

export async function registryRegister(
  api: ApiPromise,
  displayName: string,
  encryptionPubkey: Uint8Array
): Promise<any> {
  const sel = selector('register(bytes,bytes32)')
  const callData = concat(sel, encodeString(displayName), encryptionPubkey)
  return sendContractTx(api, CONTRACT_ADDRESSES.registry, callData)
}

export async function registryGetProfile(api: ApiPromise, address: string): Promise<UserProfile | null> {
  const cacheKey = `get_profile:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const sel = selector('get_profile(address)')
    const callData = concat(sel, encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.registry, callData)
    
    if (result.length === 0) {
      setCache(cacheKey, null)
      return null
    }
    
    let offset = 0
    const { str: displayName, bytesRead } = decodeString(result, offset)
    offset += bytesRead
    const encryptionPubkey = result.slice(offset, offset + 32)
    offset += 32
    const registeredAt = decodeU64(result, offset)
    
    const profile = { displayName, encryptionPubkey, registeredAt }
    setCache(cacheKey, profile)
    return profile
  } catch (err) {
    console.error('❌ [registryGetProfile] Error:', err)
    // Re-throw network/rate-limit errors so callers can distinguish from "no profile"
    throw err
  }
}

export async function registryUpdateProfile(
  api: ApiPromise,
  displayName: string,
  encryptionPubkey: Uint8Array
): Promise<any> {
  const sel = selector('update_profile(bytes,bytes32)')
  const callData = concat(sel, encodeString(displayName), encryptionPubkey)
  return sendContractTx(api, CONTRACT_ADDRESSES.registry, callData)
}

export async function registryLinkWallet(
  api: ApiPromise,
  linkedAddress: string
): Promise<any> {
  const sel = selector('link_wallet(address,bytes)')
  const emptySignature = encodeBytes(new Uint8Array(0))
  const callData = concat(sel, encodeAddress(linkedAddress), emptySignature)
  return sendContractTx(api, CONTRACT_ADDRESSES.registry, callData)
}

export async function registryConfirmLink(
  api: ApiPromise,
  primaryAddress: string
): Promise<any> {
  const sel = selector('confirm_link(address)')
  const callData = concat(sel, encodeAddress(primaryAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.registry, callData)
}

export async function registryUnlinkWallet(
  api: ApiPromise,
  linkedAddress: string
): Promise<any> {
  const sel = selector('unlink_wallet(address)')
  const callData = concat(sel, encodeAddress(linkedAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.registry, callData)
}

export async function registryGetLinkedWallets(api: ApiPromise, primaryAddress: string): Promise<string[]> {
  try {
    const sel = selector('get_linked_wallets(address)')
    const callData = concat(sel, encodeAddress(primaryAddress))
    const result = await queryContract(api, CONTRACT_ADDRESSES.registry, callData)
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    const wallets: string[] = []
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      wallets.push(decodeAddress(result, offset))
      offset += 20
    }
    return wallets
  } catch {
    return []
  }
}

export async function registryGetTotalBalance(api: ApiPromise, primaryAddress: string): Promise<bigint> {
  try {
    const sel = selector('get_total_balance(address)')
    const callData = concat(sel, encodeAddress(primaryAddress))
    const result = await queryContract(api, CONTRACT_ADDRESSES.registry, callData)
    return decodeU256(result, 0)
  } catch {
    return BigInt(0)
  }
}

export async function registryGetUserCount(api: ApiPromise): Promise<bigint> {
  try {
    const sel = selector('get_user_count()')
    const result = await queryContract(api, CONTRACT_ADDRESSES.registry, sel)
    return decodeU64(result, 0)
  } catch {
    return BigInt(0)
  }
}

export async function podsCreatePod(
  api: ApiPromise,
  signer: InjectedAccountWithMeta,
  name: string,
  description: string,
  minBalance: bigint,
  entryFee: bigint = BigInt(0),
  payoutWallet: string = '0x0000000000000000000000000000000000000000'
): Promise<any> {
  const sel = selector('create_pod(bytes,bytes,uint256,uint256,address)')
  const callData = concat(
    sel, 
    encodeString(name), 
    encodeString(description), 
    encodeU256(minBalance),
    encodeU256(entryFee),
    encodeAddress(payoutWallet)
  )
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsSendMessage(
  api: ApiPromise,
  signer: InjectedAccountWithMeta,
  podId: number,
  contentHash: Uint8Array
): Promise<any> {
  const sel = selector('send_pod_message(uint64,bytes32)')
  const callData = concat(sel, encodeU64(podId), contentHash)
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  return result
}

export async function podsGetPod(api: ApiPromise, podId: number): Promise<Pod | null> {
  const cacheKey = `get_pod:${podId}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const sel = selector('get_pod(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    if (!result || result.length === 0) {
      return null
    }

    let offset = 0
    
    if (result.length < 8) {
      return null
    }
    
    const id = decodeU64(result, offset)
    offset += 8
    
    const { str: name, bytesRead: nameBytes } = decodeString(result, offset)
    if (nameBytes === 0) {
      return null
    }
    offset += nameBytes
    
    const { str: description, bytesRead: descBytes } = decodeString(result, offset)
    if (descBytes === 0) {
      return null
    }
    offset += descBytes
    
    if (offset + 32 > result.length) {
      return null
    }
    const minBalance = decodeU256(result, offset)
    offset += 32
    
    if (offset + 20 > result.length) {
      console.error(`[podsGetPod] Result too short for creator at offset ${offset}`)
      return null
    }
    const creator = decodeAddress(result, offset)
    offset += 20
    
    if (offset + 8 > result.length) {
      console.error(`[podsGetPod] Result too short for createdAt at offset ${offset}`)
      return null
    }
    const createdAt = decodeU64(result, offset)
    offset += 8
    
    if (offset + 2 > result.length) {
      console.error(`[podsGetPod] Result too short for isDefault/podType at offset ${offset}`)
      return null
    }
    const isDefault = result[offset] === 1
    offset += 1
    const podType = result[offset]
    
    // Fetch additional data from separate storage
    const [tier, entryFee, payoutWallet, memberCount] = await Promise.all([
      podsGetPodTier(podId),
      podsGetPodFee(podId),
      podsGetPodPayoutWallet(api, podId),
      podsGetPodMemberCount(podId)
    ])
    
    const pod = { 
      id, 
      name, 
      description, 
      minBalance, 
      creator, 
      createdAt, 
      isDefault, 
      podType,
      tier,
      entryFee,
      payoutWallet,
      memberCount
    }
    setCache(cacheKey, pod)
    return pod
  } catch (err) {
    console.error(`[podsGetPod] Error fetching pod ${podId}:`, err)
    return null
  }
}

// Helper to get payout wallet for a pod
async function podsGetPodPayoutWallet(api: ApiPromise, podId: number): Promise<string> {
  try {
    // We need to query storage directly since there's no getter function
    // For now, return empty - can be added if contract exposes a getter
    return ''
  } catch {
    return ''
  }
}

export async function podsGetPodMessages(
  api: ApiPromise,
  podId: number,
  start: number = 0,
  limit: number = 50
): Promise<PodMessage[]> {
  try {
    const sel = selector('get_pod_messages(uint64,uint64,uint64)')
    const callData = concat(sel, encodeU64(podId), encodeU64(start), encodeU64(limit))
    
    // Use connected wallet address if available, otherwise queryContract will use Alice's address
    const { useWalletStore } = await import('@/stores/wallet')
    const walletAddress = useWalletStore.getState().address
    
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData, walletAddress || undefined)
    
    if (result.length === 0) {
      return []
    }
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    const rawMessages: { sender: string; contentHash: Uint8Array; timestamp: number; originalIndex: number }[] = []
    let offset = bytesRead
    
    for (let i = 0; i < length; i++) {
      const sender = decodeAddress(result, offset)
      offset += 20
      const contentHash = result.slice(offset, offset + 32)
      offset += 32
      const timestamp = Number(decodeU64(result, offset)) * 1000
      offset += 8
      rawMessages.push({ sender, contentHash, timestamp, originalIndex: i })
    }
    
    // Reassemble chunked messages for pod messages
    const reassembled = reassemblePodMessages(rawMessages, podId)
    
    return reassembled
  } catch (err) {
    console.error(`❌ [podsGetPodMessages] Error fetching messages for pod ${podId}:`, err)
    return []
  }
}

/**
 * Reassemble chunked pod messages
 * Protocol: Each chunk is Uint8Array(32): byte[0]=0xFF(magic), byte[1]=chunkIndex, byte[2]=totalChunks, bytes[3-31]=content(29 bytes)
 */
interface PodRawMessage {
  sender: string
  contentHash: Uint8Array
  timestamp: number
  originalIndex: number
}

function reassemblePodMessages(
  rawMessages: PodRawMessage[],
  podId: number
): PodMessage[] {
  const result: { msg: PodMessage; originalIndex: number }[] = []
  const chunkGroups = new Map<string, PodRawMessage[]>()
  
  // First pass: separate non-chunked messages and group chunks
  for (const msg of rawMessages) {
    if (!isChunkedMessage(msg.contentHash)) {
      // Not chunked - decode as single message (full 32 bytes, trimmed of nulls)
      const content = new TextDecoder().decode(msg.contentHash).replace(/\0/g, '').trim()
      result.push({
        msg: {
          id: `${podId}-${msg.sender.slice(0, 8)}-${msg.timestamp}-${result.length}`,
          podId,
          sender: msg.sender,
          contentHash: msg.contentHash,
          timestamp: msg.timestamp,
          content,
        },
        originalIndex: msg.originalIndex,
      })
      continue
    }
    
    // Chunked message - extract header info
    // Protocol: byte[0]=0xFF(magic), byte[1]=chunkIndex, byte[2]=totalChunks
    const chunkIndex = msg.contentHash[1]
    const totalChunks = msg.contentHash[2]
    
    // Create a group key: same sender + same totalChunks + timestamps within 60s window
    // Using 60 second buckets to handle sequential chunk sending with 3s delays
    const timeWindow = Math.floor(msg.timestamp / 60000) // 60 second buckets (timestamps are in ms)
    const groupKey = `${msg.sender}-${timeWindow}-${totalChunks}`
    
    if (!chunkGroups.has(groupKey)) {
      chunkGroups.set(groupKey, new Array(totalChunks))
    }
    const group = chunkGroups.get(groupKey)!
    group[chunkIndex] = msg
  }
  
  // Second pass: reassemble complete chunk groups
  for (const [groupKey, chunks] of chunkGroups) {
    const firstChunk = chunks.find(c => c !== undefined)
    if (!firstChunk) continue
    
    const expectedChunks = firstChunk.contentHash[2] // byte 2: total chunks
    const receivedChunks = chunks.filter(Boolean).length
    
    // Check if we have all chunks (indices 0 through totalChunks-1)
    const hasAllChunks = chunks.length === expectedChunks && chunks.every(c => c !== undefined)
    
    if (hasAllChunks) {
      // Reassemble content: concatenate bytes[3-31] from each chunk (29 bytes per chunk)
      const reassembled = new Uint8Array(expectedChunks * CHUNK_CONTENT_SIZE)
      
      for (let i = 0; i < expectedChunks; i++) {
        const chunk = chunks[i]
        if (!chunk) continue // safety check
        const content = chunk.contentHash.slice(CHUNK_HEADER_SIZE) // bytes 3-31
        reassembled.set(content, i * CHUNK_CONTENT_SIZE)
      }
      
      // Find actual content length (trim trailing null bytes)
      let actualLength = reassembled.length
      for (let i = 0; i < reassembled.length; i++) {
        if (reassembled[i] === 0) {
          actualLength = i
          break
        }
      }
      const trimmed = reassembled.slice(0, actualLength)
      
      // Decode reassembled content as UTF-8
      const content = new TextDecoder().decode(trimmed).trim()
      
      result.push({
        msg: {
          id: `${podId}-${firstChunk.sender.slice(0, 8)}-${firstChunk.timestamp}-${result.length}`,
          podId,
          sender: firstChunk.sender,
          contentHash: trimmed,
          timestamp: firstChunk.timestamp,
          content,
        },
        originalIndex: firstChunk.originalIndex,
      })
    } else {
      // Incomplete group - hide the chunks (don't display)
      // The next poll will pick up remaining chunks
    }
  }
  
  // Sort by original index to maintain on-chain order
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  
  return result.map(r => r.msg)
}

export async function podsGetPodCount(api: ApiPromise): Promise<number> {
  const cacheKey = 'get_pod_count'
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const sel = selector('get_pod_count()')
    
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, sel)
    
    if (result.length === 0) {
      return 0
    }
    
    const decoded = decodeU64(result, 0)
    const count = Number(decoded)
    setCache(cacheKey, count)
    return count
  } catch (err) {
    console.error('❌ [podsGetPodCount] Error:', err)
    return 0
  }
}

// Access check return codes:
// 0 = granted
// 1 = pod-banned
// 2 = globally banned
// 3 = insufficient balance
// 4 = payment required
// 5 = locked (threshold=0 and fee=0)
// 6 = free pod full (50 members)
export async function podsCheckAccess(api: ApiPromise, podId: number, address: string): Promise<{ granted: boolean; code: number }> {
  const cacheKey = `check_pod_access:${podId}:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const sel = selector('check_pod_access(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const code = result[0] || 0
    const value = { granted: code === 0, code }
    setCache(cacheKey, value)
    return value
  } catch {
    return { granted: false, code: 255 }
  }
}

// ============ MODERATION FUNCTIONS ============

export async function podsBanMember(podId: number, targetAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('ban_member(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsUnbanMember(podId: number, targetAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('unban_member(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsAddMod(podId: number, moderatorAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('add_mod(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(moderatorAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsRemoveMod(podId: number, moderatorAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('remove_mod(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(moderatorAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsGlobalBan(targetAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('global_ban(address)')
  const callData = concat(sel, encodeAddress(targetAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsGlobalUnban(targetAddress: string): Promise<any> {
  const api = await getApi()
  const sel = selector('global_unban(address)')
  const callData = concat(sel, encodeAddress(targetAddress))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsIsBanned(podId: number, address: string): Promise<boolean> {
  const cacheKey = `is_banned:${podId}:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('is_banned(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = result[0] === 1
    setCache(cacheKey, value)
    return value
  } catch {
    return false
  }
}

export async function podsIsGloballyBanned(address: string): Promise<boolean> {
  const cacheKey = `is_globally_banned:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('is_globally_banned(address)')
    const callData = concat(sel, encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = result[0] === 1
    setCache(cacheKey, value)
    return value
  } catch {
    return false
  }
}

export async function podsGetMods(podId: number): Promise<string[]> {
  const cacheKey = `get_mods:${podId}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('get_mods(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    const mods: string[] = []
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      mods.push(decodeAddress(result, offset))
      offset += 20
    }
    setCache(cacheKey, mods)
    return mods
  } catch {
    return []
  }
}

// ============ TIER FUNCTIONS ============

export async function podsSetProFee(amount: bigint): Promise<any> {
  const api = await getApi()
  const sel = selector('set_pro_fee(uint256)')
  const callData = concat(sel, encodeU256(amount))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsSetTreasury(address: string): Promise<any> {
  const api = await getApi()
  const sel = selector('set_treasury(address)')
  const callData = concat(sel, encodeAddress(address))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsGetProFee(): Promise<bigint> {
  try {
    const api = await getApi()
    const sel = selector('get_pro_fee()')
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, sel)
    console.log('[podsGetProFee] raw result length:', result.length)
    const fee = decodeU256(result, 0)
    console.log('[podsGetProFee] decoded fee:', fee.toString())
    if (fee === BigInt(0)) {
      console.warn('[podsGetProFee] Fee query returned 0, using fallback 500 QF')
      return BigInt('500000000000000000000')
    }
    return fee
  } catch (err) {
    console.error('[podsGetProFee] Query failed, using fallback:', err)
    return BigInt('500000000000000000000')
  }
}

export async function podsGetTreasury(): Promise<string | null> {
  try {
    const api = await getApi()
    const sel = selector('get_treasury()')
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, sel)
    if (result.length >= 20) {
      return decodeAddress(result, 0)
    }
    return null
  } catch {
    return null
  }
}

export async function podsGetPodTier(podId: number): Promise<number> {
  const cacheKey = `get_pod_tier:${podId}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('get_pod_tier(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = result[0] || 0
    setCache(cacheKey, value)
    return value
  } catch {
    return 0
  }
}

export async function podsUpgradePod(podId: number, fee: bigint): Promise<any> {
  const api = await getApi()
  const sel = selector('upgrade_pod(uint64)')
  const callData = concat(sel, encodeU64(podId))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData, fee)
}

// ============ PAID PODS FUNCTIONS ============

export async function podsJoinPod(podId: number, fee: bigint = BigInt(0)): Promise<any> {
  const api = await getApi()
  const sel = selector('join_pod(uint64)')
  const callData = concat(sel, encodeU64(podId))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData, fee)
}

export async function podsHasPaid(podId: number, address: string): Promise<boolean> {
  const cacheKey = `has_paid:${podId}:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('has_paid(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = result[0] === 1
    setCache(cacheKey, value)
    return value
  } catch {
    return false
  }
}

export async function podsGetPodFee(podId: number): Promise<bigint> {
  const cacheKey = `get_pod_fee:${podId}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('get_pod_fee(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = decodeU256(result, 0)
    setCache(cacheKey, value)
    return value
  } catch {
    return BigInt(0)
  }
}

export async function podsGetPodMemberCount(podId: number): Promise<number> {
  const cacheKey = `get_pod_member_count:${podId}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('get_pod_member_count(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    const value = Number(decodeU64(result, 0))
    setCache(cacheKey, value)
    return value
  } catch {
    return 0
  }
}

/**
 * Get all pod IDs that a user is a member of (on-chain reverse index)
 * This is the production-grade replacement for localStorage-based membership tracking
 */
export async function podsGetUserPods(address: string): Promise<number[]> {
  const cacheKey = `get_user_pods:${address.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const api = await getApi()
    const sel = selector('get_user_pods(address)')
    const callData = concat(sel, encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    console.log('[podsGetUserPods] raw result length:', result.length)
    
    if (result.length === 0) {
      console.log('[podsGetUserPods] empty result, user has no pods')
      setCache(cacheKey, [])
      return []
    }
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    console.log('[podsGetUserPods] vec length:', length, 'bytesRead:', bytesRead)
    const pods: number[] = []
    let offset = bytesRead
    
    for (let i = 0; i < length; i++) {
      if (offset + 8 > result.length) {
        console.warn('[podsGetUserPods] truncated at index', i)
        break
      }
      pods.push(Number(decodeU64(result, offset)))
      offset += 8
    }
    
    console.log('[podsGetUserPods] decoded pods:', pods)
    setCache(cacheKey, pods)
    return pods
  } catch (err) {
    console.error('[podsGetUserPods] Error:', err)
    return []
  }
}

export async function messagesSendMessage(
  api: ApiPromise,
  signer: InjectedAccountWithMeta,
  recipient: string,
  contentHash: Uint8Array,
  nonce: Uint8Array
): Promise<any> {
  const sel = selector('send_message(address,bytes32,bytes24)')
  const callData = concat(sel, encodeAddress(recipient), contentHash, nonce)
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.messages, callData)
  return result
}

export async function messagesGetMessages(
  api: ApiPromise,
  address1: string,
  address2: string,
  start: number = 0,
  limit: number = 50
): Promise<DirectMessage[]> {
  try {
    const sel = selector('get_messages(address,address,uint64,uint64)')
    const callData = concat(sel, encodeAddress(address1), encodeAddress(address2), encodeU64(start), encodeU64(limit))
    const result = await queryContract(api, CONTRACT_ADDRESSES.messages, callData)
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    const rawMessages: RawMessageWithIndex[] = []
    let offset = bytesRead
    
    for (let i = 0; i < length; i++) {
      const sender = decodeAddress(result, offset)
      offset += 20
      const recipient = decodeAddress(result, offset)
      offset += 20
      const contentHash = result.slice(offset, offset + 32)
      offset += 32
      const timestamp = Number(decodeU64(result, offset)) * 1000
      offset += 8
      const nonce = result.slice(offset, offset + 24)
      offset += 24
      
      rawMessages.push({ sender, recipient, contentHash, timestamp, nonce, originalIndex: i })
    }
    
    // Reassemble chunked messages
    const reassembled = reassembleChunkedMessages(rawMessages)
    
    // Convert to DirectMessage format with decoded content
    // Reassembled messages have contentHash set to the full reassembled content (for chunked)
    // or the original 32-byte content (for non-chunked)
    return reassembled.map((msg) => {
      // Decode contentHash as UTF-8 text (trim trailing null bytes)
      const content = new TextDecoder().decode(msg.contentHash).replace(/\0/g, '').trim()
      return { 
        sender: msg.sender, 
        recipient: msg.recipient, 
        contentHash: msg.contentHash, 
        timestamp: msg.timestamp, 
        nonce: msg.nonce, 
        content 
      }
    })
  } catch {
    return []
  }
}

export async function messagesGetConversations(api: ApiPromise, address: string): Promise<string[]> {
  try {
    const sel = selector('get_conversations(address)')
    const callData = concat(sel, encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.messages, callData)
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    
    const conversations: string[] = []
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      const addr = decodeAddress(result, offset)
      conversations.push(addr.toLowerCase())
      offset += 20
    }
    return conversations
  } catch (err) {
    console.error('[messagesGetConversations] Error:', err)
    return []
  }
}

export async function messagesGetMessageCount(
  api: ApiPromise,
  address1: string,
  address2: string
): Promise<number> {
  try {
    const sel = selector('get_message_count(address,address)')
    const callData = concat(sel, encodeAddress(address1), encodeAddress(address2))
    const result = await queryContract(api, CONTRACT_ADDRESSES.messages, callData)
    return Number(decodeU64(result, 0))
  } catch {
    return 0
  }
}

// Helper functions for hooks compatibility
export async function getPublicPods(): Promise<any[]> {
  try {
    const api = await getApi()
    const count = await podsGetPodCount(api)
    const pods: any[] = []
    for (let i = 0; i < count; i++) {
      const pod = await podsGetPod(api, i)
      if (pod && !pod.isDefault) {
        pods.push(pod)
      }
    }
    return pods
  } catch (err) {
    console.error('getPublicPods error:', err)
    return []
  }
}

export async function getUserPods(address: string): Promise<number[]> {
  // Call the contract's get_user_pods function
  return podsGetUserPods(address)
}

// Removed hardcoded getDefaultPods - all pods come from contract

export async function getConversations(address: string): Promise<string[]> {
  try {
    const api = await getApi()
    return await messagesGetConversations(api, address)
  } catch (err) {
    console.error('getConversations error:', err)
    return []
  }
}

export async function getMessages(address1: string, address2: string): Promise<any[]> {
  try {
    const api = await getApi()
    const directMessages = await messagesGetMessages(api, address1, address2)
    // Map DirectMessage to Message format expected by the store
    return directMessages.map(dm => ({
      id: `${dm.sender.toLowerCase()}-${dm.timestamp}`,
      sender: dm.sender.toLowerCase(),
      recipient: dm.recipient.toLowerCase(),
      encryptedContent: dm.contentHash,
      decryptedContent: dm.content,
      timestamp: dm.timestamp,
      nonce: dm.nonce,
    }))
  } catch (err) {
    console.error('getMessages error:', err)
    return []
  }
}

export async function getPodMessages(podId: number): Promise<any[]> {
  try {
    const api = await getApi()
    return await podsGetPodMessages(api, podId)
  } catch (err) {
    console.error('getPodMessages error:', err)
    return []
  }
}

export async function getPodMembers(podId: number): Promise<string[]> {
  try {
    const api = await getApi()
    const sel = selector('get_pod_members(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    // Decode SCALE-encoded Vec<[u8; 20]>
    const { length, bytesRead } = decodeCompactLength(result, 0)
    const members: string[] = []
    let offset = bytesRead
    
    for (let i = 0; i < length; i++) {
      members.push(decodeAddress(result, offset))
      offset += 20
    }
    
    return members
  } catch (err) {
    console.error('getPodMembers error:', err)
    return []
  }
}

export async function createPodOnChain(
  address: string,
  name: string,
  description: string,
  minBalance: bigint,
  isPublic: boolean,
  tier: 'free' | 'pro',
  entryFee: bigint = BigInt(0),
  payoutWallet: string = ''
): Promise<any> {
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { walletType, evmAddress } = useWalletStore.getState()

  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }

  // Validate inputs per contract limits
  const nameBytes = new TextEncoder().encode(name)
  if (nameBytes.length > 32) {
    throw new Error('Pod name too long (max 32 bytes)')
  }
  const descBytes = new TextEncoder().encode(description)
  if (descBytes.length > 256) {
    throw new Error('Pod description too long (max 256 bytes)')
  }

  // Free pods cannot charge entry fees
  if (tier === 'free' && entryFee > 0) {
    throw new Error('Free pods cannot charge entry fees')
  }

  const api = await getApi()
  
  // Contract uses exact fee matching (==): if entryFee > 0, msg.value must == pro_fee
  let creationFee = BigInt(0)
  if (tier === 'pro' || entryFee > BigInt(0)) {
    creationFee = await podsGetProFee()
    console.log('[createPodOnChain] creationFee to send:', creationFee.toString())
    if (creationFee === BigInt(0)) {
      throw new Error('Could not determine pro creation fee — cannot create paid pod')
    }
  }
  
  // Use payout wallet or default to creator
  const finalPayoutWallet = payoutWallet || evmAddress

  const sel = selector('create_pod(bytes,bytes,uint256,uint256,address)')
  const callData = concat(
    sel, 
    encodeString(name), 
    encodeString(description), 
    encodeU256(minBalance),
    encodeU256(entryFee),
    encodeAddress(finalPayoutWallet)
  )

  // Use unified sendContractTx which handles both wallet types
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData, creationFee)

  // Return pod object for immediate display
  return {
    id: Date.now(), // Temporary ID until we can fetch real one
    name,
    description,
    minBalance,
    creator: evmAddress,
    createdAt: Date.now(),
    tier: tier === 'pro' ? 1 : 0,
    entryFee,
    payoutWallet: finalPayoutWallet,
    isDefault: false,
  }
}

export async function joinPodOnChain(podId: number, address: string, fee: bigint = BigInt(0)): Promise<boolean> {
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress, walletType, isConnected } = useWalletStore.getState()
  
  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }

  // Check access first
  const api = await getApi()
  const access = await podsCheckAccess(api, podId, evmAddress)
  
  if (!access.granted) {
    // Handle different error codes
    switch (access.code) {
      case 1:
        throw new Error('You are banned from this pod')
      case 2:
        throw new Error('You are globally banned')
      case 3:
        const pod = await podsGetPod(api, podId)
        throw new Error(`Insufficient balance. Required: ${pod?.minBalance.toString() || '0'} wei`)
      case 4:
        // Payment required - this is expected for paid pods, we'll pay now
        break
      case 5:
        throw new Error('This pod is locked')
      case 6:
        throw new Error('This pod is full')
      default:
        throw new Error('Access denied')
    }
  }

  // Call join_pod on contract (handles payment if needed)
  await podsJoinPod(podId, fee)

  return true
}

export async function leavePodOnChain(podId: number, address: string): Promise<boolean> {
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress } = useWalletStore.getState()

  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }

  const api = await getApi()
  const sel = selector('leave_pod(uint64)')
  const callData = concat(sel, encodeU64(podId))
  await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)

  return true
}

export async function banMember(podId: number, targetAddress: string): Promise<boolean> {
  const api = await getApi()
  const sel = selector('ban_member(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  return true
}

export async function unbanMember(podId: number, targetAddress: string): Promise<boolean> {
  const api = await getApi()
  const sel = selector('unban_member(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  return true
}

export async function addMod(podId: number, targetAddress: string): Promise<boolean> {
  const api = await getApi()
  const sel = selector('add_mod(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  return true
}

export async function removeMod(podId: number, targetAddress: string): Promise<boolean> {
  const api = await getApi()
  const sel = selector('remove_mod(uint64,address)')
  const callData = concat(sel, encodeU64(podId), encodeAddress(targetAddress))
  await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  return true
}

export async function getMods(podId: number): Promise<string[]> {
  try {
    const api = await getApi()
    const sel = selector('get_mods(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    // Decode array of addresses
    // First 4 bytes = length (u32)
    const length = decodeU32(result, 0)
    const mods: string[] = []
    
    for (let i = 0; i < length; i++) {
      const offset = 4 + (i * 20) // 4 bytes length + 20 bytes per address
      const addrBytes = result.slice(offset, offset + 20)
      const addr = '0x' + Array.from(addrBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      mods.push(addr)
    }
    
    return mods
  } catch (err) {
    console.error('Failed to get mods:', err)
    return []
  }
}

export async function isBanned(podId: number, address: string): Promise<boolean> {
  try {
    const api = await getApi()
    const sel = selector('is_banned(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    return result[0] === 1
  } catch {
    return false
  }
}

export async function isMod(podId: number, address: string): Promise<boolean> {
  try {
    const api = await getApi()
    const sel = selector('is_mod(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    return result[0] === 1
  } catch {
    return false
  }
}

export async function sendPodMessageOnChain(podId: number, address: string, content: string): Promise<any> {
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { walletType, evmAddress } = useWalletStore.getState()
  
  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }
  
  const api = await getApi()
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(content)
  
  // Use chunking for messages longer than 30 bytes
  const chunks = createMessageChunks(contentBytes)
  const totalChunks = chunks.length
  
  const sel = selector('send_pod_message(uint64,bytes32)')
  
  // Determine if we should use batching or sequential sending
  // Batching saves signatures but has block weight limits
  const shouldBatch = walletType !== 'evm' && totalChunks <= MAX_BATCH_CHUNKS
  
  if (shouldBatch) {
    // Collect all chunk transactions into an array for batch submission
    const txArray: any[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const contentHash = new Uint8Array(32)
      contentHash.set(chunk)
      
      const callData = concat(sel, encodeU64(podId), contentHash)
      
      // Use full gas limit for batch - limited to 2 chunks to fit in block
      const tx = api.tx.revive.call(
        CONTRACT_ADDRESSES.pods,
        '0',
        DEFAULT_GAS_LIMIT,
        DEFAULT_STORAGE_DEPOSIT,
        u8aToHex(callData)
      )
      txArray.push(tx)
    }
    
    // Send all chunks as a single batched transaction (one signature)
    const { walletSource } = useWalletStore.getState()
    if (!walletSource) {
      throw new Error('Wallet not connected')
    }
    
    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    
    const batchTx = api.tx.utility.batchAll(txArray)
    await new Promise((resolve, reject) => {
      batchTx
        .signAndSend(address, { signer: injector.signer }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) {
            resolve(result)
          }
          if (result.isError) {
            reject(new Error('Batch transaction failed'))
          }
        })
        .catch(reject)
    })
  } else {
    // Sequential sending for EVM wallets or when chunks exceed MAX_BATCH_CHUNKS
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const contentHash = new Uint8Array(32)
      contentHash.set(chunk)
      
      const callData = concat(sel, encodeU64(podId), contentHash)
      
      if (walletType === 'evm') {
        await sendContractTxEvm(CONTRACT_ADDRESSES.pods, callData)
      } else {
        // Substrate sequential send
        const { walletSource } = useWalletStore.getState()
        if (!walletSource) {
          throw new Error('Wallet not connected')
        }
        const { web3FromSource } = await import('@polkadot/extension-dapp')
        const injector = await web3FromSource(walletSource)
        
        const tx = api.tx.revive.call(
          CONTRACT_ADDRESSES.pods,
          '0',
          DEFAULT_GAS_LIMIT,
          DEFAULT_STORAGE_DEPOSIT,
          u8aToHex(callData)
        )
        
        // Send chunk with retry logic
        let retries = 0
        const maxRetries = 1
        let lastError: Error | null = null
        
        while (retries <= maxRetries) {
          try {
            const result = await new Promise((resolve, reject) => {
              tx
                .signAndSend(address, { signer: injector.signer }, (result) => {
                  if (result.status.isInBlock || result.status.isFinalized) {
                    resolve(result)
                  }
                  if (result.isError) {
                    reject(new Error(`Chunk ${i + 1} transaction failed`))
                  }
                })
                .catch(reject)
            })
            // Success - break out of retry loop
            break
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))
            retries++
            if (retries <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 3000))
            } else {
              throw lastError
            }
          }
        }
      }
      
      // Add delay between chunks to avoid rate limiting (except after last chunk)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
  }
  
  // Return message object for immediate display (use full content)
  return {
    id: `${podId}-${Date.now()}`,
    podId,
    sender: evmAddress,
    content,
    timestamp: Date.now(),
  }
}

// Constants for message chunking
const CHUNK_MAGIC_BYTE = 0xFF // Magic marker - no valid UTF-8 text starts with 0xFF
const CHUNK_CONTENT_SIZE = 29 // 32 bytes total - 3 bytes header
const CHUNK_HEADER_SIZE = 3   // byte 0: 0xFF, byte 1: chunk index, byte 2: total chunks

/**
 * Split content into chunks for multi-part message sending
 * Each chunk: [0xFF (1 byte), chunkIndex (1 byte), totalChunks (1 byte), content (29 bytes)]
 */
function createMessageChunks(content: Uint8Array): Uint8Array[] {
  const totalChunks = Math.ceil(content.length / CHUNK_CONTENT_SIZE)
  
  // Single chunk message - no header needed for backward compatibility
  if (totalChunks === 1 && content.length <= 29) {
    const chunk = new Uint8Array(32)
    chunk.set(content)
    return [chunk]
  }
  
  const chunks: Uint8Array[] = []
  for (let i = 0; i < totalChunks; i++) {
    const chunk = new Uint8Array(32)
    chunk[0] = CHUNK_MAGIC_BYTE // 0xFF magic marker
    chunk[1] = i                // chunk index
    chunk[2] = totalChunks      // total chunks
    const start = i * CHUNK_CONTENT_SIZE
    const end = Math.min(start + CHUNK_CONTENT_SIZE, content.length)
    chunk.set(content.slice(start, end), CHUNK_HEADER_SIZE)
    chunks.push(chunk)
  }
  return chunks
}

/**
 * Detect if a message chunk is part of a multi-chunk message
 * Uses 0xFF magic byte prefix - no valid UTF-8 text starts with 0xFF
 * Protocol: byte[0]=magic(0xFF), byte[1]=chunkIndex, byte[2]=totalChunks, bytes[3-31]=content
 */
function isChunkedMessage(contentHash: Uint8Array): boolean {
  // Check for magic byte 0xFF - this eliminates all false positives
  // since no valid UTF-8 text starts with 0xFF
  if (contentHash[0] !== CHUNK_MAGIC_BYTE) {
    return false
  }
  
  const chunkIndex = contentHash[1]
  const totalChunks = contentHash[2]
  
  // Validate: chunkIndex must be < totalChunks, totalChunks > 1 and <= 20
  return totalChunks > 1 && totalChunks <= 20 && chunkIndex < totalChunks
}

/**
 * Reassemble chunked messages from raw message data
 * Protocol: Each chunk is Uint8Array(32): byte[0]=0xFF(magic), byte[1]=chunkIndex, byte[2]=totalChunks, bytes[3-31]=content(29 bytes)
 */
interface RawMessage {
  sender: string
  recipient: string
  contentHash: Uint8Array
  timestamp: number
  nonce: Uint8Array
}

interface RawMessageWithIndex extends RawMessage {
  originalIndex: number
}

function reassembleChunkedMessages(rawMessages: RawMessageWithIndex[]): RawMessage[] {
  const result: { msg: RawMessage; originalIndex: number }[] = []
  const chunkGroups = new Map<string, RawMessageWithIndex[]>()
  
  // First pass: separate non-chunked messages and group chunks
  for (const msg of rawMessages) {
    if (!isChunkedMessage(msg.contentHash)) {
      // Not chunked - keep as single message
      result.push({
        msg: {
          ...msg,
          contentHash: msg.contentHash,
        },
        originalIndex: msg.originalIndex,
      })
      continue
    }
    
    // Chunked message - extract header info
    // Protocol: byte[0]=0xFF(magic), byte[1]=chunkIndex, byte[2]=totalChunks
    const chunkIndex = msg.contentHash[1]
    const totalChunks = msg.contentHash[2]
    
    // Create a group key: same sender + same recipient + same totalChunks + timestamps within 60s window
    // Using 60 second buckets to handle sequential chunk sending with 3s delays
    const timeWindow = Math.floor(msg.timestamp / 60000) // 60 second buckets (timestamps are in ms)
    const groupKey = `${msg.sender}-${msg.recipient}-${timeWindow}-${totalChunks}`
    
    if (!chunkGroups.has(groupKey)) {
      chunkGroups.set(groupKey, new Array(totalChunks))
    }
    const group = chunkGroups.get(groupKey)!
    group[chunkIndex] = msg
  }
  
  // Second pass: reassemble complete chunk groups
  for (const [groupKey, chunks] of chunkGroups) {
    const firstChunk = chunks.find(c => c !== undefined)
    if (!firstChunk) continue
    
    const expectedChunks = firstChunk.contentHash[2] // byte 2: total chunks
    const receivedChunks = chunks.filter(Boolean).length
    
    // Check if we have all chunks (indices 0 through totalChunks-1)
    const hasAllChunks = chunks.length === expectedChunks && chunks.every(c => c !== undefined)
    
    if (hasAllChunks) {
      // Reassemble content: concatenate bytes[3-31] from each chunk (29 bytes per chunk)
      const reassembled = new Uint8Array(expectedChunks * CHUNK_CONTENT_SIZE)
      
      for (let i = 0; i < expectedChunks; i++) {
        const chunk = chunks[i]
        if (!chunk) continue // safety check
        const content = chunk.contentHash.slice(CHUNK_HEADER_SIZE) // bytes 3-31
        reassembled.set(content, i * CHUNK_CONTENT_SIZE)
      }
      
      // Find actual content length (trim trailing null bytes)
      let actualLength = reassembled.length
      for (let i = 0; i < reassembled.length; i++) {
        if (reassembled[i] === 0) {
          actualLength = i
          break
        }
      }
      const trimmed = reassembled.slice(0, actualLength)
      
      result.push({
        msg: {
          sender: firstChunk.sender,
          recipient: firstChunk.recipient,
          contentHash: trimmed,
          timestamp: firstChunk.timestamp,
          nonce: firstChunk.nonce,
        },
        originalIndex: firstChunk.originalIndex,
      })
    } else {
      // Incomplete group - hide the chunks (don't display)
      // The next poll will pick up remaining chunks
    }
  }
  
  // Sort by original index to maintain on-chain order
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  
  return result.map(r => r.msg)
}

export async function sendMessageOnChain(sender: string, recipient: string, content: Uint8Array): Promise<any> {
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { walletType, evmAddress, encryptionKeyPair } = useWalletStore.getState()
  
  if (!sender || !evmAddress || !encryptionKeyPair) {
    throw new Error('Wallet not connected, not mapped, or encryption key not set')
  }
  
  const api = await getApi()
  const chunks = createMessageChunks(content)
  const totalChunks = chunks.length
  
  const sel = selector('send_message(address,bytes32,bytes24)')
  
  // Determine if we should use batching or sequential sending
  // Batching saves signatures but has block weight limits
  const shouldBatch = walletType !== 'evm' && totalChunks <= MAX_BATCH_CHUNKS
  
  if (shouldBatch) {
    // Collect all chunk transactions into an array for batch submission
    const txArray: any[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const contentHash = new Uint8Array(32)
      contentHash.set(chunk)
      
      // Generate a dummy nonce (required by contract, but not used for raw content)
      const nonce = new Uint8Array(24)
      
      const callData = concat(sel, encodeAddress(recipient), contentHash, nonce)
      
      // Use full gas limit for batch - limited to 2 chunks to fit in block
      const tx = api.tx.revive.call(
        CONTRACT_ADDRESSES.messages,
        '0',
        DEFAULT_GAS_LIMIT,
        DEFAULT_STORAGE_DEPOSIT,
        u8aToHex(callData)
      )
      txArray.push(tx)
    }
    
    // Send all chunks as a single batched transaction (one signature)
    const { walletSource } = useWalletStore.getState()
    if (!walletSource) {
      throw new Error('Wallet not connected')
    }
    
    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    
    const batchTx = api.tx.utility.batchAll(txArray)
    await new Promise((resolve, reject) => {
      batchTx
        .signAndSend(sender, { signer: injector.signer }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) {
            resolve(result)
          }
          if (result.isError) {
            reject(new Error('Batch transaction failed'))
          }
        })
        .catch(reject)
    })
  } else {
    // Sequential sending for EVM wallets or when chunks exceed MAX_BATCH_CHUNKS
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const contentHash = new Uint8Array(32)
      contentHash.set(chunk)
      
      // Generate a dummy nonce (required by contract, but not used for raw content)
      const nonce = new Uint8Array(24)
      
      const callData = concat(sel, encodeAddress(recipient), contentHash, nonce)
      
      if (walletType === 'evm') {
        await sendContractTxEvm(CONTRACT_ADDRESSES.messages, callData)
      } else {
        // Substrate sequential send
        const { walletSource } = useWalletStore.getState()
        if (!walletSource) {
          throw new Error('Wallet not connected')
        }
        const { web3FromSource } = await import('@polkadot/extension-dapp')
        const injector = await web3FromSource(walletSource)
        
        const tx = api.tx.revive.call(
          CONTRACT_ADDRESSES.messages,
          '0',
          DEFAULT_GAS_LIMIT,
          DEFAULT_STORAGE_DEPOSIT,
          u8aToHex(callData)
        )
        
        // Send chunk with retry logic
        let retries = 0
        const maxRetries = 1
        let lastError: Error | null = null
        
        while (retries <= maxRetries) {
          try {
            await new Promise((resolve, reject) => {
              tx
                .signAndSend(sender, { signer: injector.signer }, (result) => {
                  if (result.status.isInBlock || result.status.isFinalized) {
                    resolve(result)
                  }
                  if (result.isError) {
                    reject(new Error(`Chunk ${i + 1} transaction failed`))
                  }
                })
                .catch(reject)
            })
            // Success - break out of retry loop
            break
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))
            retries++
            if (retries <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 3000))
            } else {
              throw lastError
            }
          }
        }
      }
      
      // Add delay between chunks to avoid rate limiting (except after last chunk)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
  }
  
  // Return message object for immediate display (use full content)
  return {
    id: `${evmAddress}-${Date.now()}`,
    sender: evmAddress.toLowerCase(),
    recipient: recipient.toLowerCase(),
    encryptedContent: content,
    decryptedContent: new TextDecoder().decode(content),
    timestamp: Date.now(),
  }
}

export function decryptPodMessage(podId: number, content: string): string {
  return content
}

export function encryptMessage(content: string, recipientPubkey: Uint8Array): Uint8Array {
  return new TextEncoder().encode(content)
}

