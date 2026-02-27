import type { ApiPromise } from '@polkadot/api'
import { u8aToHex, hexToU8a } from '@polkadot/util'
import { keccak256AsU8a } from '@polkadot/util-crypto'
import { getApi, type InjectedAccountWithMeta } from './chain'

export const CONTRACT_ADDRESSES = {
  registry: import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  pods: import.meta.env.VITE_PODS_ADDRESS || '0x0000000000000000000000000000000000000000',
  messages: import.meta.env.VITE_MESSAGES_ADDRESS || '0x0000000000000000000000000000000000000000',
}

console.log('📋 Contract addresses:', CONTRACT_ADDRESSES)
console.log('ENV registry:', import.meta.env.VITE_REGISTRY_ADDRESS)
console.log('ENV pods:', import.meta.env.VITE_PODS_ADDRESS)
console.log('ENV messages:', import.meta.env.VITE_MESSAGES_ADDRESS)

const DECIMALS_18 = BigInt(10) ** BigInt(18)
const DEFAULT_GAS_LIMIT = { refTime: BigInt(10000000000), proofSize: BigInt(10000000000) }
const DEFAULT_STORAGE_DEPOSIT = (BigInt(10) ** BigInt(18)).toString()

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
        if (result.status.isInBlock || result.status.isFinalized) {
          resolve(result)
        }
        if (result.isError) {
          reject(new Error('Transaction failed'))
        }
      })
      .catch(reject)
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
        console.log('⛽ [sendContractTxEvm] Gas estimated:', estimatedGas.toString(), 'buffered:', bufferedGas.toString())
      } else {
        throw new Error('Gas estimation failed: ' + (estimateData.error?.message || 'Unknown error'))
      }
    } catch (err) {
      console.warn('⚠️ [sendContractTxEvm] Gas estimation failed, using default:', err)
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

  console.log('📤 [sendContractTxEvm] Transaction sent:', txHash)

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
        console.log('✅ [sendContractTxEvm] Transaction confirmed:', data.result)
        return { 
          txHash, 
          receipt: data.result,
          status: { isFinalized: true, isInBlock: true }
        }
      }
    } catch (err) {
      console.warn('⚠️ [sendContractTxEvm] Error polling receipt:', err)
    }
  }

  // Timeout - return anyway
  console.warn('⚠️ [sendContractTxEvm] Transaction receipt timeout')
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
  console.log('🔍 [queryContract] Using api.call.reviveApi.call()')
  console.log('   Contract:', contractAddress)
  console.log('   Call data:', u8aToHex(callData))
  
  // Verify reviveApi is available before proceeding
  if (!api.call || !(api.call as any).reviveApi || typeof (api.call as any).reviveApi.call !== 'function') {
    console.warn('⚠️ [queryContract] reviveApi not available, re-awaiting API...')
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
      console.log('   Using wallet Substrate address as origin:', origin)
    } else {
      console.log('   No wallet connected, using Alice address as origin:', origin)
    }
  } catch {
    console.log('   Using default origin (Alice address):', origin)
  }
  
  try {
    // Log all parameters before making the call
    console.log('🔍 [queryContract] Parameters:')
    console.log('   origin:', origin?.toString())
    console.log('   dest:', contractAddress)
    console.log('   value:', '0')
    console.log('   gasLimit:', null)
    console.log('   storageDepositLimit:', null)
    console.log('   inputData:', u8aToHex(callData))
    try {
      const { useWalletStore } = await import('@/stores/wallet')
      console.log('   wallet connected:', useWalletStore?.getState()?.address)
    } catch {
      console.log('   wallet connected: N/A')
    }
    
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
    
    console.log('   Raw response:', response)
    const responseJson = response.toJSON ? response.toJSON() : response
    console.log('   Response JSON:', JSON.stringify(responseJson, null, 2))
    
    // Extract the result from the response
    const result = (response as any).result
    console.log('   result:', result)
    console.log('   result keys:', Object.keys(result || {}))
    console.log('   result.result:', (result as any)?.result)
    
    // Try Rust-style enum access (isOk/asOk)
    if (result && typeof result.isOk === 'boolean') {
      console.log('   result.isOk:', result.isOk)
      if (result.isOk) {
        const execResult = result.asOk
        console.log('   execResult:', execResult)
        const data = execResult.data
        console.log('   data type:', typeof data)
        console.log('   data instanceof Uint8Array:', data instanceof Uint8Array)
        console.log('✅ [queryContract] Success - return data:', data)
        
        // Handle different data types
        if (data instanceof Uint8Array) {
          // Check if response is "Unknown function" error
          if (data.length === 16) {
            const text = new TextDecoder().decode(data)
            if (text === 'Unknown function') {
              const selector = u8aToHex(callData.slice(0, 4))
              console.error('❌ Contract did not recognize selector:', selector)
              console.error('   Call data:', u8aToHex(callData))
              console.error('   This means the function signature is wrong or the contract is not deployed correctly')
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
        const err = result.asErr
        console.error('❌ Contract call failed:', err)
        console.error('❌ Error type:', err.type)
        if (err.isModule) {
          const mod = err.asModule
          console.error('❌ Module error - index:', mod.index.toString(), 'error:', mod.error.toHex())
          try {
            const decoded = api.registry.findMetaError(mod)
            console.error('❌ Decoded error:', decoded.section, decoded.name, decoded.docs.join(' '))
          } catch (e) {
            console.error('❌ Could not decode module error')
          }
        }
        return new Uint8Array(0)
      }
    }
    
    // Try JSON structure access
    const resultJson = result?.toJSON ? result.toJSON() : result
    console.log('   result JSON:', JSON.stringify(resultJson, null, 2))
    
    if (resultJson?.Ok?.data) {
      const data = resultJson.Ok.data
      console.log('✅ [queryContract] Success - data:', data)
      if (data instanceof Uint8Array) {
        return data
      } else if (typeof data === 'string') {
        return hexToU8a(data)
      }
    }
    if (resultJson?.data) {
      const data = resultJson.data
      console.log('✅ [queryContract] Success - data:', data)
      if (data instanceof Uint8Array) {
        return data
      } else if (typeof data === 'string') {
        return hexToU8a(data)
      }
    }
    
    console.error('❌ Unexpected result format')
    return new Uint8Array(0)
    
  } catch (err) {
    console.error('❌ [queryContract] Runtime API call failed:', err)
    return new Uint8Array(0)
  }
}

function decodeU64(data: Uint8Array, offset: number = 0): bigint {
  let result = BigInt(0)
  for (let i = 0; i < 8; i++) {
    result |= BigInt(data[offset + i]) << BigInt(i * 8)
  }
  return result
}

function decodeU256(data: Uint8Array, offset: number = 0): bigint {
  let result = BigInt(0)
  for (let i = 0; i < 32; i++) {
    result |= BigInt(data[offset + i]) << BigInt(i * 8)
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
  console.log('🔍 [registryGetProfile] Querying address:', address)
  console.log('   Registry contract:', CONTRACT_ADDRESSES.registry)
  
  try {
    const sel = selector('get_profile(address)')
    const callData = concat(sel, encodeAddress(address))
    console.log('   Call data:', u8aToHex(callData))
    
    const result = await queryContract(api, CONTRACT_ADDRESSES.registry, callData)
    console.log('   Raw result length:', result.length)
    console.log('   Raw result hex:', u8aToHex(result))
    
    if (result.length === 0) {
      console.log('⚠️ [registryGetProfile] Empty result - profile not found')
      return null
    }
    
    let offset = 0
    const { str: displayName, bytesRead: nameBytes } = decodeString(result, offset)
    offset += nameBytes
    const encryptionPubkey = result.slice(offset, offset + 32)
    offset += 32
    const registeredAt = decodeU64(result, offset)
    
    console.log('✅ [registryGetProfile] Decoded profile:')
    console.log('   displayName:', displayName)
    console.log('   encryptionPubkey length:', encryptionPubkey.length)
    console.log('   registeredAt:', registeredAt)
    
    return { displayName, encryptionPubkey, registeredAt }
  } catch (err) {
    console.error('❌ [registryGetProfile] Error:', err)
    return null
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
  minBalance: bigint
): Promise<any> {
  const sel = selector('create_pod(bytes,bytes,uint256)')
  const callData = concat(sel, encodeString(name), encodeString(description), encodeU256(minBalance))
  return sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
}

export async function podsSendMessage(
  api: ApiPromise,
  signer: InjectedAccountWithMeta,
  podId: number,
  contentHash: Uint8Array
): Promise<any> {
  console.log(`📤 [podsSendMessage] Sending message to pod ${podId}`)
  const sel = selector('send_pod_message(uint64,bytes32)')
  const callData = concat(sel, encodeU64(podId), contentHash)
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
  console.log('✅ [podsSendMessage] Transaction finalized')
  return result
}

export async function podsGetPod(api: ApiPromise, podId: number): Promise<Pod | null> {
  try {
    const sel = selector('get_pod(uint64)')
    const callData = concat(sel, encodeU64(podId))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    
    let offset = 0
    const id = decodeU64(result, offset)
    offset += 8
    const { str: name, bytesRead: nameBytes } = decodeString(result, offset)
    offset += nameBytes
    const { str: description, bytesRead: descBytes } = decodeString(result, offset)
    offset += descBytes
    const minBalance = decodeU256(result, offset)
    offset += 32
    const creator = decodeAddress(result, offset)
    offset += 20
    const createdAt = decodeU64(result, offset)
    offset += 8
    const isDefault = result[offset] === 1
    offset += 1
    const podType = result[offset]
    
    return { id, name, description, minBalance, creator, createdAt, isDefault, podType }
  } catch {
    return null
  }
}

export async function podsGetPodMessages(
  api: ApiPromise,
  podId: number,
  start: number = 0,
  limit: number = 50
): Promise<PodMessage[]> {
  try {
    console.log(`📨 [podsGetPodMessages] Fetching messages for pod ${podId}, start: ${start}, limit: ${limit}`)
    const sel = selector('get_pod_messages(uint64,uint64,uint64)')
    const callData = concat(sel, encodeU64(podId), encodeU64(start), encodeU64(limit))
    console.log('   Call data:', u8aToHex(callData))
    console.log('   Selector:', u8aToHex(sel))
    console.log('   Pod ID bytes (u64):', u8aToHex(encodeU64(podId)))
    console.log('   Start bytes (u64):', u8aToHex(encodeU64(start)))
    console.log('   Limit bytes (u64):', u8aToHex(encodeU64(limit)))
    
    // Use connected wallet address if available, otherwise queryContract will use Alice's address
    const { useWalletStore } = await import('@/stores/wallet')
    const walletAddress = useWalletStore.getState().address
    
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData, walletAddress || undefined)
    console.log('   Query result length:', result.length)
    
    if (result.length === 0) {
      console.log('   Empty result - no messages')
      return []
    }
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    console.log(`   Decoded ${length} messages`)
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
    
    console.log(`✅ [podsGetPodMessages] Fetched ${reassembled.length} messages for pod ${podId}`)
    return reassembled
  } catch (err) {
    console.error(`❌ [podsGetPodMessages] Error fetching messages for pod ${podId}:`, err)
    return []
  }
}

/**
 * Reassemble chunked pod messages
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
  console.log('[reassemblePod] raw messages count:', rawMessages.length)
  console.log('[reassemblePod] raw messages:', rawMessages.map(m => ({
    originalIndex: m.originalIndex,
    sender: m.sender.slice(0, 8) + '...',
    timestamp: new Date(m.timestamp).toISOString(),
    contentHex: Array.from(m.contentHash).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''),
    isChunked: isChunkedMessage(m.contentHash)
  })))
  
  // Detailed debug logging for Chefs pod issue
  console.log('[reassemblePod] input messages:', rawMessages.map((m, i) => ({
    index: i,
    sender: m.sender?.slice(0, 10),
    contentBytes: Array.from(m.contentHash || []).slice(0, 5),
    isChunked: isChunkedMessage(m.contentHash),
    decoded: new TextDecoder().decode(m.contentHash)
  })))
  
  const result: { msg: PodMessage; originalIndex: number }[] = []
  const chunkGroups = new Map<string, PodRawMessage[]>()
  
  // Group potential chunks by sender+timeWindow
  for (const msg of rawMessages) {
    if (!isChunkedMessage(msg.contentHash)) {
      // Not chunked - decode as single message, preserve original index
      const content = new TextDecoder().decode(msg.contentHash).replace(/\0/g, '').trim()
      result.push({
        msg: {
          id: `${podId}-${msg.sender}-${msg.timestamp}-${result.length}`,
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
    
    const chunkIndex = msg.contentHash[1] // byte 1: chunk index (byte 0 is 0xFF magic)
    const totalChunks = msg.contentHash[2] // byte 2: total chunks
    
    // Create a group key based on sender and approximate timestamp (30 second window)
    const timeWindow = Math.floor(msg.timestamp / 30000) // 30 second buckets
    const groupKey = `${msg.sender}-${timeWindow}-${totalChunks}`
    
    if (!chunkGroups.has(groupKey)) {
      chunkGroups.set(groupKey, [])
    }
    const group = chunkGroups.get(groupKey)!
    group[chunkIndex] = msg
  }
  
  console.log('[reassemblePod] chunk groups:', chunkGroups.size)
  
  // Reassemble complete messages
  for (const [groupKey, chunks] of chunkGroups) {
    const firstChunk = chunks.find(c => c !== undefined)
    if (!firstChunk) continue
    
    const expectedChunks = firstChunk.contentHash[2] // byte 2: total chunks
    const receivedChunks = chunks.filter(Boolean).length
    
    console.log(`[reassemblePod] group ${groupKey}: ${receivedChunks}/${expectedChunks} chunks`)
    
    // Check if we have all chunks
    const hasAllChunks = chunks.length === expectedChunks && chunks.every(c => c !== undefined)
    
    if (hasAllChunks) {
      // Reassemble content
      const reassembled = new Uint8Array(expectedChunks * CHUNK_CONTENT_SIZE)
      
      for (let i = 0; i < expectedChunks; i++) {
        const chunk = chunks[i]
        if (!chunk) continue // safety check
        const content = chunk.contentHash.slice(CHUNK_HEADER_SIZE)
        reassembled.set(content, i * CHUNK_CONTENT_SIZE)
      }
      
      // Find actual content length (first null byte or full length)
      let actualLength = reassembled.length
      for (let i = 0; i < reassembled.length; i++) {
        if (reassembled[i] === 0) {
          actualLength = i
          break
        }
      }
      const trimmed = reassembled.slice(0, actualLength)
      
      // Decode reassembled content
      const content = new TextDecoder().decode(trimmed).trim()
      
      console.log(`[reassemblePod] successfully reassembled ${expectedChunks} chunks, content length: ${content.length}`)
      
      result.push({
        msg: {
          id: `${podId}-${firstChunk.sender}-${firstChunk.timestamp}-${result.length}`,
          podId,
          sender: firstChunk.sender,
          contentHash: trimmed,
          timestamp: firstChunk.timestamp,
          content,
        },
        originalIndex: firstChunk.originalIndex, // Use index of first chunk for ordering
      })
    } else {
      // Incomplete - add individual chunks as separate messages
      console.log(`[reassemblePod] incomplete chunks, adding ${receivedChunks} individual messages`)
      for (const chunk of chunks) {
        if (chunk) {
          const content = new TextDecoder().decode(chunk.contentHash.slice(CHUNK_HEADER_SIZE)).replace(/\0/g, '').trim()
          result.push({
            msg: {
              id: `${podId}-${chunk.sender}-${chunk.timestamp}-${result.length}`,
              podId,
              sender: chunk.sender,
              contentHash: chunk.contentHash.slice(CHUNK_HEADER_SIZE),
              timestamp: chunk.timestamp,
              content,
            },
            originalIndex: chunk.originalIndex,
          })
        }
      }
    }
  }
  
  // Sort by original index to maintain on-chain order
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  
  console.log('[reassemblePod] final result count:', result.length)
  return result.map(r => r.msg)
}

export async function podsGetPodCount(api: ApiPromise): Promise<number> {
  try {
    console.log('📊 [podsGetPodCount] Preparing call...')
    const sel = selector('get_pod_count()')
    const selHex = u8aToHex(sel)
    console.log('   Selector bytes:', sel)
    console.log('   Selector hex:', selHex)
    console.log('   Call data (just selector, no params):', selHex)
    console.log('   Contract address:', CONTRACT_ADDRESSES.pods)
    
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, sel)
    console.log('   Query result:', result)
    console.log('   Result length:', result.length)
    console.log('   Result hex:', u8aToHex(result))
    
    if (result.length === 0) {
      console.log('⚠️ [podsGetPodCount] Empty result - pod_count not set')
      return 0
    }
    
    const decoded = decodeU64(result, 0)
    console.log('   Decoded count:', decoded)
    return Number(decoded)
  } catch (err) {
    console.error('❌ [podsGetPodCount] Error:', err)
    return 0
  }
}

export async function podsCheckAccess(api: ApiPromise, podId: number, address: string): Promise<boolean> {
  try {
    const sel = selector('check_pod_access(uint64,address)')
    const callData = concat(sel, encodeU64(podId), encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.pods, callData)
    return result[0] === 1
  } catch {
    return false
  }
}

export async function messagesSendMessage(
  api: ApiPromise,
  signer: InjectedAccountWithMeta,
  recipient: string,
  contentHash: Uint8Array,
  nonce: Uint8Array
): Promise<any> {
  console.log(`📤 [messagesSendMessage] Sending DM to ${recipient}`)
  const sel = selector('send_message(address,bytes32,bytes24)')
  const callData = concat(sel, encodeAddress(recipient), contentHash, nonce)
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.messages, callData)
  console.log('✅ [messagesSendMessage] Transaction finalized')
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
    return reassembled.map((msg, index) => {
      // Decode contentHash as UTF-8 text (works for both single and reassembled messages)
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
  console.log('[messagesGetConversations] Querying for address:', address)
  try {
    const sel = selector('get_conversations(address)')
    const callData = concat(sel, encodeAddress(address))
    const result = await queryContract(api, CONTRACT_ADDRESSES.messages, callData)
    
    console.log('[messagesGetConversations] Raw result length:', result.length)
    console.log('[messagesGetConversations] Raw result hex:', u8aToHex(result))
    
    const { length, bytesRead } = decodeCompactLength(result, 0)
    console.log('[messagesGetConversations] Decoded count:', length)
    
    const conversations: string[] = []
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      const addr = decodeAddress(result, offset)
      console.log(`[messagesGetConversations] Conversation ${i}:`, addr)
      conversations.push(addr.toLowerCase())
      offset += 20
    }
    console.log('[messagesGetConversations] Returning:', conversations)
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

export async function getUserPods(address: string): Promise<any[]> {
  // For now, return empty array - this would need a contract function to track user's joined pods
  return []
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
  // This would need a contract function to track pod members
  return []
}

export async function createPodOnChain(
  address: string,
  name: string,
  description: string,
  minBalance: bigint,
  isPublic: boolean,
  tier: string
): Promise<any> {
  console.log(`📤 [createPodOnChain] Creating pod "${name}"`)

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

  const api = await getApi()
  const sel = selector('create_pod(bytes,bytes,uint256)')
  const callData = concat(sel, encodeString(name), encodeString(description), encodeU256(minBalance))

  // Use unified sendContractTx which handles both wallet types
  const result = await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)

  console.log('✅ [createPodOnChain] Pod created successfully')

  // Return pod object for immediate display
  return {
    id: Date.now(), // Temporary ID until we can fetch real one
    name,
    description,
    minBalance,
    creator: evmAddress,
    createdAt: Date.now(),
    tier,
    isDefault: false,
  }
}

export async function joinPodOnChain(podId: number, address: string): Promise<boolean> {
  console.log(`📤 [joinPodOnChain] Checking access for pod ${podId}`)

  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress } = useWalletStore.getState()

  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }

  // Check if user has access to this pod (balance meets threshold)
  const api = await getApi()
  const hasAccess = await podsCheckAccess(api, podId, evmAddress)

  if (!hasAccess) {
    const pod = await podsGetPod(api, podId)
    const minBalance = pod?.minBalance || BigInt(0)
    throw new Error(`Insufficient balance. Required: ${minBalance.toString()} wei`)
  }

  console.log('✅ [joinPodOnChain] Access granted for pod', podId)
  return true
}

export async function leavePodOnChain(podId: number, address: string): Promise<boolean> {
  console.log(`📤 [leavePodOnChain] Leaving pod ${podId}`)

  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress } = useWalletStore.getState()

  if (!address || !evmAddress) {
    throw new Error('Wallet not connected or not mapped')
  }

  // No contract call needed - membership is just local state
  // Balance check will prevent access if they no longer qualify
  console.log('✅ [leavePodOnChain] Left pod', podId)
  return true
}

export async function sendPodMessageOnChain(podId: number, address: string, content: string): Promise<any> {
  console.log(`📤 [sendPodMessageOnChain] Sending message to pod ${podId}, length: ${content.length} chars`)
  
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
  
  console.log(`📤 [sendPodMessageOnChain] Split into ${totalChunks} chunk(s)`)
  
  const sel = selector('send_pod_message(uint64,bytes32)')
  
  // Send all chunks sequentially with delay to avoid rate limiting
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const contentHash = new Uint8Array(32)
    contentHash.set(chunk)
    
    const callData = concat(sel, encodeU64(podId), contentHash)
    
    // Use unified sendContractTx which handles both wallet types
    await sendContractTx(api, CONTRACT_ADDRESSES.pods, callData)
    
    if (totalChunks > 1) {
      console.log(`📤 [sendPodMessageOnChain] Sent chunk ${i + 1}/${totalChunks}`)
    }
    
    // Add delay between chunks to avoid rate limiting (except after last chunk)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
    }
  }
  
  console.log('✅ [sendPodMessageOnChain] Message sent successfully')
  
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
  console.log('[reassemble] raw messages count:', rawMessages.length)
  console.log('[reassemble] raw messages:', rawMessages.map(m => ({
    originalIndex: m.originalIndex,
    sender: m.sender.slice(0, 8) + '...',
    timestamp: new Date(m.timestamp).toISOString(),
    contentHex: Array.from(m.contentHash).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''),
    isChunked: isChunkedMessage(m.contentHash)
  })))
  
  const result: { msg: RawMessage; originalIndex: number }[] = []
  const chunkGroups = new Map<string, RawMessageWithIndex[]>()
  
  // Group potential chunks by sender+recipient+timeWindow
  for (const msg of rawMessages) {
    if (!isChunkedMessage(msg.contentHash)) {
      // Not chunked - decode as single message, preserve original index
      result.push({
        msg: {
          ...msg,
          contentHash: msg.contentHash,
        },
        originalIndex: msg.originalIndex,
      })
      continue
    }
    
    const chunkIndex = msg.contentHash[1] // byte 1: chunk index (byte 0 is 0xFF magic)
    const totalChunks = msg.contentHash[2] // byte 2: total chunks
    
    // Create a group key based on sender, recipient, and approximate timestamp (30 second window)
    const timeWindow = Math.floor(msg.timestamp / 30000) // 30 second buckets
    const groupKey = `${msg.sender}-${msg.recipient}-${timeWindow}-${totalChunks}`
    
    if (!chunkGroups.has(groupKey)) {
      chunkGroups.set(groupKey, [])
    }
    const group = chunkGroups.get(groupKey)!
    group[chunkIndex] = msg
  }
  
  console.log('[reassemble] chunk groups:', chunkGroups.size)
  
  // Reassemble complete messages
  for (const [groupKey, chunks] of chunkGroups) {
    const firstChunk = chunks.find(c => c !== undefined)
    if (!firstChunk) continue
    
    const expectedChunks = firstChunk.contentHash[2] // byte 2: total chunks
    const receivedChunks = chunks.filter(Boolean).length
    
    console.log(`[reassemble] group ${groupKey}: ${receivedChunks}/${expectedChunks} chunks`)
    
    // Check if we have all chunks
    const hasAllChunks = chunks.length === expectedChunks && chunks.every(c => c !== undefined)
    
    if (hasAllChunks) {
      // Reassemble content
      const reassembled = new Uint8Array(expectedChunks * CHUNK_CONTENT_SIZE)
      
      for (let i = 0; i < expectedChunks; i++) {
        const chunk = chunks[i]
        if (!chunk) continue // safety check
        const content = chunk.contentHash.slice(CHUNK_HEADER_SIZE)
        reassembled.set(content, i * CHUNK_CONTENT_SIZE)
      }
      
      // Find actual content length (first null byte or full length)
      let actualLength = reassembled.length
      for (let i = 0; i < reassembled.length; i++) {
        if (reassembled[i] === 0) {
          actualLength = i
          break
        }
      }
      const trimmed = reassembled.slice(0, actualLength)
      
      console.log(`[reassemble] successfully reassembled ${expectedChunks} chunks, content length: ${trimmed.length}`)
      
      result.push({
        msg: {
          sender: firstChunk.sender,
          recipient: firstChunk.recipient,
          contentHash: trimmed,
          timestamp: firstChunk.timestamp,
          nonce: firstChunk.nonce,
        },
        originalIndex: firstChunk.originalIndex, // Use index of first chunk for ordering
      })
    } else {
      // Incomplete - add individual chunks as separate messages
      console.log(`[reassemble] incomplete chunks, adding ${receivedChunks} individual messages`)
      for (const chunk of chunks) {
        if (chunk) {
          result.push({
            msg: {
              ...chunk,
              contentHash: chunk.contentHash.slice(CHUNK_HEADER_SIZE),
            },
            originalIndex: chunk.originalIndex,
          })
        }
      }
    }
  }
  
  // Sort by original index to maintain on-chain order
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  
  console.log('[reassemble] final result count:', result.length)
  return result.map(r => r.msg)
}

export async function sendMessageOnChain(sender: string, recipient: string, content: Uint8Array): Promise<any> {
  console.log(`📤 [sendMessageOnChain] Sending DM from ${sender} to ${recipient}, length: ${content.length} bytes`)
  
  // Get wallet info
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress, encryptionKeyPair } = useWalletStore.getState()
  
  if (!sender || !evmAddress || !encryptionKeyPair) {
    throw new Error('Wallet not connected, not mapped, or encryption key not set')
  }
  
  const api = await getApi()
  const chunks = createMessageChunks(content)
  const totalChunks = chunks.length
  
  console.log(`📤 [sendMessageOnChain] Split into ${totalChunks} chunk(s)`)
  
  // Send all chunks sequentially with delay to avoid rate limiting
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const contentHash = new Uint8Array(32)
    contentHash.set(chunk)
    
    // Generate a dummy nonce (required by contract, but not used for raw content)
    const nonce = new Uint8Array(24)
    
    const sel = selector('send_message(address,bytes32,bytes24)')
    const callData = concat(sel, encodeAddress(recipient), contentHash, nonce)
    
    // Use unified sendContractTx which handles both wallet types
    await sendContractTx(api, CONTRACT_ADDRESSES.messages, callData)
    
    if (totalChunks > 1) {
      console.log(`📤 [sendMessageOnChain] Sent chunk ${i + 1}/${totalChunks}`)
    }
    
    // Add delay between chunks to avoid rate limiting (except after last chunk)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
    }
  }
  
  console.log('✅ [sendMessageOnChain] DM sent successfully')
  
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

