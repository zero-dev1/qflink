/**
 * contractCalls.ts — viem-based contract interaction layer (v2 micro-contracts)
 *
 * Uses standard publicClient.readContract / walletClient.writeContract
 * for native Solidity ABI encoding/decoding.
 *
 * Pods are now split into micro-contracts:
 * - podsCreate: createPod
 * - podsJoin: joinPod
 * - podsLeave: leavePod
 * - podsBan: banMember, unbanMember
 * - podsAddMod: addMod
 * - podsRemoveMod: removeMod
 * - podsAdmin: upgradePod
 * - podsReader: all view functions
 * - podsGetPod: getPod
 */

import {
  stringToHex,
  hexToString,
  toHex,
  fromHex,
  type Hash,
  encodeFunctionData,
} from 'viem'

import { getPublicClient, getWalletClient, CONTRACT_ADDRESSES, qfChain } from './viemClient'
import { decodeContractError, getContractErrorMessage } from './contractErrors'
import { getActiveLocalSession, getSessionWalletClient } from './sessionKeys'
import { registryAbi } from '@/abi/registry'
import { podsCreateAbi } from '@/abi/podsCreate'
import { podsJoinAbi } from '@/abi/podsJoin'
import { podsLeaveAbi } from '@/abi/podsLeave'
import { podsBanAbi } from '@/abi/podsBan'
import { podsAddModAbi } from '@/abi/podsAddMod'
import { podsRemoveModAbi } from '@/abi/podsRemoveMod'
import { podsAdminAbi } from '@/abi/podsAdmin'
import { podsReaderAbi } from '@/abi/podsReader'
import { podsGetPodAbi } from '@/abi/podsGetPod'
import { podsCreatePaidAbi } from '@/abi/podsCreatePaid'
import { paymentsAbi } from '@/abi/payments'
import { messagesWriterAbi } from '@/abi/messagesWriter'
import { messagesWriterV2Abi } from '@/abi/messagesWriterV2'
import { messagesReaderAbi } from '@/abi/messagesReader'

/** Convert a UTF-8 string to a right-padded bytes32 hex */
function toBytes32(s: string): `0x${string}` {
  return stringToHex(s, { size: 32 })
}

/** Convert a bytes32 hex back to a trimmed UTF-8 string */
function fromBytes32(b: `0x${string}`): string {
  return hexToString(b, { size: 32 }).replace(/\0/g, '')
}

/** Wait for a tx receipt after a write, then ensure the block is indexed */
async function waitReceipt(hash: Hash, functionName: string = 'unknown') {
  console.log(`[${functionName}] Waiting for tx:`, hash)
  
  const client = getPublicClient()
  
  // Phase 1: Poll eth_getTransactionReceipt until receipt is available
  let receipt: any = null
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 500))
    try {
      receipt = await client.getTransactionReceipt({ hash })
      if (receipt) {
        console.log(`[${functionName}] Confirmed in block:`, receipt.blockNumber)
        break
      }
    } catch {
      // Not mined yet, keep polling
    }
  }
  if (!receipt) {
    throw new Error(`${functionName} was not mined within 60 seconds`)
  }
  if (receipt.status === 'reverted') {
    throw new Error(`${functionName} transaction reverted`)
  }
  return receipt
}

/**
 * Wait until eth-rpc's latest_block cache has advanced past the confirmed
 * block, proving the BestBlocks subscription callback has fully committed
 * block N's state (receipts + SQLite writes) before we read.
 *
 * Root cause (polkadot-sdk-2509, fixed in stable2512):
 *  - PR #10146: BestBlocks and FinalizedBlocks subscription callbacks run
 *    concurrently without a lock; a FinalizedBlocks write can race a
 *    BestBlocks write for the same block, leaving state temporarily unreadable.
 *  - PR #10252: on automine, FinalizedBlocks subscription is separate; until
 *    block N+1 is produced and indexed, block N's BestBlocks callback may
 *    still be in-flight.
 *
 * Waiting for eth_blockNumber > confirmedBlockNumber (i.e. block N+1 exists)
 * guarantees both subscriptions have finished processing block N.
 */
export async function waitForBlockSync(confirmedBlockNumber: bigint): Promise<void> {
  const client = getPublicClient()
  const target = confirmedBlockNumber + 1n
  // Increase timeout: 120 iterations * 250ms = 30 seconds max wait
  for (let i = 0; i < 120; i++) {
    try {
      const current = await client.getBlockNumber({ cacheTime: 0 })
      if (current >= target) {
        console.log(`[waitForBlockSync] Block ${current} >= ${target} — state committed`)
        return
      }
    } catch {
      // transient RPC error, keep polling
    }
    await new Promise(r => setTimeout(r, 250))
  }
  console.warn(`[waitForBlockSync] Timed out waiting for block ${target} — proceeding anyway`)
}

// ============================================================
//  REGISTRY — reads
// ============================================================

export interface UserProfile {
  displayName: string
  encryptionPubkey: `0x${string}`
  registeredAt: bigint
}

export async function getProfile(address: `0x${string}`, blockNumber?: bigint): Promise<UserProfile | null> {
  try {
    const client = getPublicClient()
    const [displayNameB32, encryptionPubkey, registeredAt] = await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'getProfile',
      args: [address],
      ...(blockNumber ? { blockNumber } : {}),
    })

    if (registeredAt === 0n) return null

    return {
      displayName: fromBytes32(displayNameB32 as `0x${string}`),
      encryptionPubkey: encryptionPubkey as `0x${string}`,
      registeredAt,
    }
  } catch (err) {
    // UserNotFound custom error — return null
    const errStr = String(err)
    if (errStr.includes('UserNotFound') || errStr.includes('0x')) {
      const raw = decodeContractError(err)
      if (!raw || raw.includes('UserNotFound')) return null
    }
    console.error('[contractCalls.getProfile] Full error:', err)
    return null
  }
}

export async function getUserCount(): Promise<bigint> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'getUserCount',
    })
  } catch (err) {
    console.error('[contractCalls.getUserCount] Full error:', err)
    return 0n
  }
}

// v1 stubs for removed functions — maintain backward compat
export async function getLinkedWallets(_primaryAddress: `0x${string}`): Promise<string[]> {
  return []
}

export async function isGloballyBanned(_address: `0x${string}`): Promise<boolean> {
  return false
}

// ============================================================
//  REGISTRY — writes
// ============================================================

export async function registerProfile(displayName: string, encryptionPubkey: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'register',
      args: [toBytes32(displayName), encryptionPubkey],
    })
    return waitReceipt(hash, 'registerProfile')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[registerProfile] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function updateProfile(displayName: string, encryptionPubkey: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'updateProfile',
      args: [toBytes32(displayName), encryptionPubkey],
    })
    return waitReceipt(hash, 'updateProfile')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[updateProfile] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

// v1 stubs for removed registry write functions
export async function linkWallet(_linkedAddress: `0x${string}`) {
  throw new Error('Wallet linking is not available in v1')
}

export async function confirmLink(_primaryAddress: `0x${string}`) {
  throw new Error('Wallet linking is not available in v1')
}

export async function unlinkWallet(_linkedAddress: `0x${string}`) {
  throw new Error('Wallet linking is not available in v1')
}

export async function globalBan(_target: `0x${string}`) {
  throw new Error('Global bans are not available in v1')
}

export async function globalUnban(_target: `0x${string}`) {
  throw new Error('Global bans are not available in v1')
}

// ============================================================
//  PODS — reads (all routed through PodsReader)
// ============================================================

export interface PodData {
  id: bigint
  name: string
  description: string
  minBalance: bigint
  creator: string
  createdAt: bigint
  isDefault: boolean
  podType: number
  tier: number
  entryFee?: bigint
  payoutWallet?: string
  memberCount: number
  isPublic: boolean
  fee?: bigint
  threshold: bigint
  modCount: number
  category: string
}

export async function getPodCount(blockNumber?: bigint): Promise<number> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'getPodCount',
      ...(blockNumber ? { blockNumber } : {}),
    })
    return Number(result)
  } catch (err) {
    console.error('[contractCalls.getPodCount] Full error:', err)
    return 0
  }
}

export async function getPod(podId: number, blockNumber?: bigint): Promise<PodData | null> {
  try {
    const client = getPublicClient()
    const [nameB32, creator, isPublic, tier, memberCount, modCount, threshold, categoryB32, descriptionBytes] = await client.readContract({
      address: CONTRACT_ADDRESSES.podsGetPod,
      abi: podsGetPodAbi,
      functionName: 'getPod',
      args: [BigInt(podId)],
      ...(blockNumber ? { blockNumber } : {}),
    })

    const name = fromBytes32(nameB32 as `0x${string}`)
    const category = fromHex(categoryB32 as `0x${string}`, 'string').replace(/\0/g, '')
    const description = fromHex(descriptionBytes as `0x${string}`, 'string')
    const creatorAddr = (creator as string).toLowerCase()
    
    // Skip non-existent pods (zero address creator)
    if (creatorAddr === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return {
      id: BigInt(podId),
      name: name || `Pod ${podId}`, // Fallback name if empty
      description: description || '',
      minBalance: threshold as bigint,
      creator: creatorAddr,
      createdAt: 0n,
      isDefault: false, // All pods from contract are user-created
      podType: 0,
      tier: Number(tier),
      memberCount: Number(memberCount),
      modCount: Number(modCount),
      isPublic: isPublic as boolean,
      threshold: threshold as bigint,
      category: category || 'trading',
    }
  } catch (err) {
    console.error(`[contractCalls.getPod] Error for pod ${podId}:`, err)
    return null
  }
}

export async function getAllPods(): Promise<PodData[]> {
  const count = await getPodCount()
  const pods: PodData[] = []
  for (let i = 1; i <= count; i++) {
    const pod = await getPod(i)
    if (pod) pods.push(pod)
  }
  return pods
}

// Get all pods that a user is a member of
export async function getUserPods(address: `0x${string}`, blockNumber?: bigint): Promise<number[]> {
  try {
    const count = await getPodCount(blockNumber)
    if (count === 0) return []
    
    // Check membership for all pods in parallel for better performance
    const membershipChecks = await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const podId = i + 1
        return isMember(podId, address, blockNumber).then(isMember => ({ podId, isMember }))
      })
    )
    
    const memberPods = membershipChecks
      .filter(({ isMember }) => isMember)
      .map(({ podId }) => podId)
    
    return memberPods
  } catch (err) {
    console.error('[contractCalls.getUserPods] Full error:', err)
    return []
  }
}

export async function getPodMemberCount(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    const count = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'getMemberCount',
      args: [BigInt(podId)],
    })
    return Number(count)
  } catch (err) {
    console.error(`[contractCalls.getPodMemberCount] Error for pod ${podId}:`, err)
    return 0
  }
}

export async function getModCount(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    const count = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'getModCount',
      args: [BigInt(podId)],
    })
    return Number(count)
  } catch (err) {
    console.error(`[contractCalls.getModCount] Error for pod ${podId}:`, err)
    return 0
  }
}

// v1 workaround — Get members by checking message senders and their membership status
// The contract doesn't expose a function to enumerate all members
// This function takes a list of candidate addresses (e.g., from messages) and filters by membership
export async function getPodMembersFromCandidates(
  podId: number, 
  candidateAddresses: string[]
): Promise<string[]> {
  try {
    // Check membership for all candidates in parallel
    const membershipResults = await Promise.all(
      candidateAddresses.map(async (addr) => ({
        addr,
        isMember: await isMember(podId, addr as `0x${string}`)
      }))
    )
    
    return membershipResults
      .filter(({ isMember }) => isMember)
      .map(({ addr }) => addr.toLowerCase())
  } catch (err) {
    console.error(`[contractCalls.getPodMembersFromCandidates] Error for pod ${podId}:`, err)
    return []
  }
}

// Legacy stub - kept for backward compatibility
export async function getPodMembers(_podId: number): Promise<string[]> {
  return []
}

export async function checkPodAccess(
  podId: number,
  address: `0x${string}`,
  blockNumber?: bigint
): Promise<{ granted: boolean; code: number }> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'checkPodAccess',
      args: [BigInt(podId), address],
      ...(blockNumber ? { blockNumber } : {}),
    })
    return { granted: result as boolean, code: result ? 0 : 1 }
  } catch (err) {
    console.error('[contractCalls.checkPodAccess] Full error:', err)
    return { granted: false, code: 255 }
  }
}

export interface RawPodMessage {
  sender: string
  content: string
  timestamp: number
  id: number
}

async function _fetchMessage(client: any, id: bigint) {
  const [sender, timestamp, content, podId, recipient] = await client.readContract({
    address: CONTRACT_ADDRESSES.messageReader,
    abi: messagesReaderAbi,
    functionName: 'getMessage',
    args: [id],
  })
  return {
    sender: (sender as string).toLowerCase(),
    timestamp: Number(timestamp as bigint) * 1000,
    content: content as string,
    podId: Number(podId),
    recipient: (recipient as string).toLowerCase(),
  }
}

export async function getPodMessages(
  podId: number,
  start = 0,
  limit = 100
): Promise<RawPodMessage[]> {
  try {
    const client = getPublicClient()
    const ids = await client.readContract({
      address: CONTRACT_ADDRESSES.messageReader,
      abi: messagesReaderAbi,
      functionName: 'getPodMessageIds',
      args: [BigInt(podId), BigInt(start), BigInt(limit)],
    }) as bigint[]

    const messages = await Promise.all(
      ids.map(async (id) => {
        const m = await _fetchMessage(client, id)
        return {
          id: Number(id),
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
        }
      })
    )
    return messages
  } catch (err) {
    console.error(`[contractCalls.getPodMessages] Error for pod ${podId}:`, err)
    return []
  }
}

export async function getPodMessageCount(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.messageReader,
      abi: messagesReaderAbi,
      functionName: 'getPodMessageCount',
      args: [BigInt(podId)],
    })
    return Number(result)
  } catch (err) {
    console.error(`[contractCalls.getPodMessageCount] Error for pod ${podId}:`, err)
    return 0
  }
}

export async function getPodTier(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    const tier = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'getPodTier',
      args: [BigInt(podId)],
    })
    return Number(tier)
  } catch (err) {
    console.error('[contractCalls.getPodTier] Full error:', err)
    return 0
  }
}

export async function getPodFee(podId: number): Promise<bigint> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'getEntryFee',
      args: [BigInt(podId)],
    })
  } catch (err) {
    console.error('[contractCalls.getPodFee] Full error:', err)
    return 0n
  }
}

export async function hasPaid(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'hasPaid',
      args: [BigInt(podId), address],
    })
  } catch (err) {
    console.error('[contractCalls.hasPaid] Full error:', err)
    return false
  }
}

// Payment functions
export async function payEntryFee(podId: number, fee: bigint) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'payEntryFee',
      args: [BigInt(podId)],
      value: fee,
    })
    return waitReceipt(hash, 'payEntryFee')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[payEntryFee] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function setEntryFee(podId: number, fee: bigint) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsAdmin,
      abi: podsAdminAbi,
      functionName: 'setEntryFee',
      args: [BigInt(podId), fee],
    })
    return waitReceipt(hash, 'setEntryFee')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[setEntryFee] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function getEntryFee(podId: number, blockNumber?: bigint): Promise<bigint> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'getEntryFee',
      args: [BigInt(podId)],
      ...(blockNumber ? { blockNumber } : {}),
    })
  } catch (err) {
    console.error('[contractCalls.getEntryFee] Full error:', err)
    return 0n
  }
}

// Stubs for removed functions
export async function getProFee(): Promise<bigint> { return 0n }
export async function getTreasury(): Promise<string | null> { return null }

// ── Moderation reads (all through PodsReader) ──

export async function isBanned(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'isBanned',
      args: [BigInt(podId), address],
    })
  } catch (err) {
    console.error('[contractCalls.isBanned] Full error:', err)
    return false
  }
}

export async function isMod(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'isMod',
      args: [BigInt(podId), address],
    })
  } catch (err) {
    console.error('[contractCalls.isMod] Full error:', err)
    return false
  }
}

export async function isMember(podId: number, address: `0x${string}`, blockNumber?: bigint): Promise<boolean> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'isMember',
      args: [BigInt(podId), address],
      ...(blockNumber ? { blockNumber } : {}),
    })
  } catch (err) {
    console.error('[contractCalls.isMember] Full error:', err)
    return false
  }
}

// v1 workaround — Get mods by checking candidate addresses
// The contract doesn't expose a function to enumerate all mods
// This function takes a list of candidate addresses and filters by mod status
export async function getModsFromCandidates(
  podId: number, 
  candidateAddresses: string[]
): Promise<string[]> {
  try {
    // Check mod status for all candidates in parallel
    const modResults = await Promise.all(
      candidateAddresses.map(async (addr) => ({
        addr,
        isModStatus: await isMod(podId, addr as `0x${string}`)
      }))
    )
    
    return modResults
      .filter(({ isModStatus }) => isModStatus)
      .map(({ addr }) => addr.toLowerCase())
  } catch (err) {
    console.error(`[contractCalls.getModsFromCandidates] Error for pod ${podId}:`, err)
    return []
  }
}

// Legacy stub - kept for backward compatibility  
export async function getMods(_podId: number): Promise<string[]> { return [] }

export async function getCreator(podId: number): Promise<string | null> {
  try {
    const client = getPublicClient()
    const creator = await client.readContract({
      address: CONTRACT_ADDRESSES.podsReader,
      abi: podsReaderAbi,
      functionName: 'getCreator',
      args: [BigInt(podId)],
    })
    return (creator as string).toLowerCase()
  } catch (err) {
    console.error('[contractCalls.getCreator] Full error:', err)
    return null
  }
}

// ============================================================
//  PODS — writes (routed to specific micro-contracts)
// ============================================================

export async function createPod(
  name: string,
  description: string,
  threshold: bigint = 0n,
  _entryFee: bigint = 0n,
  _payoutWallet?: `0x${string}`,
  category: string = 'trading'
) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  // Encode description as hex bytes (max 256 bytes enforced by contract)
  const descriptionHex = toHex(new TextEncoder().encode(description.slice(0, 256)))

  // Creation fee: 500 QF (500 * 10^18 wei)
  const CREATION_FEE = 500000000000000000000n

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsCreate,
      abi: podsCreateAbi,
      functionName: 'createPod',
      args: [toBytes32(name.trim()), true, threshold, toBytes32(category), descriptionHex],
      value: CREATION_FEE,
    })
    return waitReceipt(hash, 'createPod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[createPod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function createPaidPod(
  name: string,
  isPublic: boolean,
  threshold: bigint,
  entryFee: bigint,
  creationFee: bigint,
  category: string = 'trading',
  description: string = ''
) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  const nameBytes32 = toBytes32(name)
  
  // Encode description as hex bytes (max 256 bytes enforced by contract)
  const descriptionHex = toHex(new TextEncoder().encode(description.slice(0, 256)))

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsCreatePaid,
      abi: podsCreatePaidAbi,
      functionName: 'createPaidPod',
      args: [nameBytes32, isPublic, threshold, entryFee, toBytes32(category), descriptionHex],
      value: creationFee,
    })
    return waitReceipt(hash, 'createPaidPod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[createPaidPod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function joinPod(podId: number, _fee: bigint = 0n) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  const publicClient = getPublicClient()

  try {
    // Check if user already paid (e.g., rejoining after unban)
    const alreadyPaid = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'hasPaid',
      args: [BigInt(podId), account],
    })
    // Always fetch fresh fee from chain before joining (creator may have changed it)
    const freshFee = await getEntryFee(podId)
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsJoin,
      abi: podsJoinAbi,
      functionName: 'joinPod',
      args: [BigInt(podId)],
      value: alreadyPaid ? 0n : freshFee,
    })
    return waitReceipt(hash, 'joinPod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[joinPod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function leavePod(podId: number) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsLeave,
      abi: podsLeaveAbi,
      functionName: 'leavePod',
      args: [BigInt(podId)],
    })
    return waitReceipt(hash, 'leavePod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[leavePod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function sendPodMessage(podId: number, content: string) {
  // Try session key first (no MetaMask popup)
  const session = getActiveLocalSession()
  if (session) {
    const sessionClient = getSessionWalletClient()
    if (sessionClient) {
      try {
        const hash = await sessionClient.writeContract({
          chain: qfChain,
          address: CONTRACT_ADDRESSES.messageWriterV2,
          abi: messagesWriterV2Abi,
          functionName: 'sendPodMessage',
          args: [BigInt(podId), content],
        })
        return waitReceipt(hash, 'sendPodMessage')
      } catch (err) {
        const raw = decodeContractError(err)
        console.error('[sendPodMessage:session] Raw contract error:', raw, err)
        throw new Error(getContractErrorMessage(err))
      }
    }
  }

  // Fallback: MetaMask popup
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.messageWriter,
      abi: messagesWriterAbi,
      functionName: 'sendPodMessage',
      args: [BigInt(podId), content],
    })
    return waitReceipt(hash, 'sendPodMessage')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[sendPodMessage] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function upgradePod(podId: number, fee: bigint) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsAdmin,
      abi: podsAdminAbi,
      functionName: 'upgradePod',
      args: [BigInt(podId)],
      value: fee,
    })
    return waitReceipt(hash, 'upgradePod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[upgradePod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

// ── Moderation writes (routed to specific micro-contracts) ──

export async function banMember(podId: number, target: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsBan,
      abi: podsBanAbi,
      functionName: 'banMember',
      args: [BigInt(podId), target],
    })
    return waitReceipt(hash, 'banMember')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[banMember] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function unbanMember(podId: number, target: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsBan,
      abi: podsBanAbi,
      functionName: 'unbanMember',
      args: [BigInt(podId), target],
    })
    return waitReceipt(hash, 'unbanMember')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[unbanMember] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function addMod(podId: number, moderator: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsAddMod,
      abi: podsAddModAbi,
      functionName: 'addMod',
      args: [BigInt(podId), moderator],
    })
    return waitReceipt(hash, 'addMod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[addMod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function removeMod(podId: number, moderator: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')


  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.podsRemoveMod,
      abi: podsRemoveModAbi,
      functionName: 'removeMod',
      args: [BigInt(podId), moderator],
    })
    return waitReceipt(hash, 'removeMod')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[removeMod] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

// v1 stubs — admin functions removed
export async function setProFee(_amount: bigint) { throw new Error('Not available in v1') }
export async function setTreasury(_addr: `0x${string}`) { throw new Error('Not available in v1') }

// ============================================================
//  ADMIN — Payments contract
// ============================================================

export async function getPaymentsOwner(): Promise<string | null> {
  try {
    const client = getPublicClient()
    const owner = await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'owner',
    })
    return (owner as string).toLowerCase()
  } catch (err) {
    console.error('[contractCalls.getPaymentsOwner] Full error:', err)
    return null
  }
}

export async function getPaymentsTreasury(): Promise<string | null> {
  try {
    const client = getPublicClient()
    const treasury = await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'treasury',
    })
    return (treasury as string).toLowerCase()
  } catch (err) {
    console.error('[contractCalls.getPaymentsTreasury] Full error:', err)
    return null
  }
}

export async function getPaymentsBalance(): Promise<bigint> {
  try {
    const client = getPublicClient()
    return await client.readContract({
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'getContractBalance',
    })
  } catch (err) {
    console.error('[contractCalls.getPaymentsBalance] Full error:', err)
    return 0n
  }
}

export async function setPaymentsTreasury(treasury: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'setTreasury',
      args: [treasury],
    })
    return waitReceipt(hash, 'setPaymentsTreasury')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[setPaymentsTreasury] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function setPaymentsAuthorized(auth: `0x${string}`, status: boolean) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'setAuthorized',
      args: [auth, status],
    })
    return waitReceipt(hash, 'setPaymentsAuthorized')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[setPaymentsAuthorized] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function withdrawPayments(amount: bigint) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'withdraw',
      args: [amount],
    })
    return waitReceipt(hash, 'withdrawPayments')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[withdrawPayments] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function withdrawPaymentsToTreasury(amount: bigint) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'withdrawToTreasury',
      args: [amount],
    })
    return waitReceipt(hash, 'withdrawPaymentsToTreasury')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[withdrawPaymentsToTreasury] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

export async function transferPaymentsOwnership(newOwner: `0x${string}`) {
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.payments,
      abi: paymentsAbi,
      functionName: 'transferOwnership',
      args: [newOwner],
    })
    return waitReceipt(hash, 'transferPaymentsOwnership')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[transferPaymentsOwnership] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

// ============================================================
//  MESSAGES — reads
// ============================================================

export interface DirectMessageData {
  sender: string
  recipient: string
  content: string
  timestamp: number
}

export async function getMessages(
  addr1: `0x${string}`,
  addr2: `0x${string}`,
  start = 0,
  limit = 50
): Promise<DirectMessageData[]> {
  try {
    const client = getPublicClient()
    const ids = await client.readContract({
      address: CONTRACT_ADDRESSES.messageReader,
      abi: messagesReaderAbi,
      functionName: 'getDirectMessageIds',
      args: [addr1, addr2, BigInt(start), BigInt(limit)],
    }) as bigint[]

    const messages = await Promise.all(
      ids.map(async (id) => {
        const m = await _fetchMessage(client, id)
        return {
          sender: m.sender,
          recipient: m.sender === addr1.toLowerCase()
            ? addr2.toLowerCase()
            : addr1.toLowerCase(),
          content: m.content,
          timestamp: m.timestamp,
        }
      })
    )
    return messages
  } catch (err) {
    console.error('[contractCalls.getMessages] Full error:', err)
    return []
  }
}

export async function getConversations(address: `0x${string}`): Promise<string[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.messageReader,
      abi: messagesReaderAbi,
      functionName: 'getConversations',
      args: [address],
    })
    return (result as string[]).map((a: string) => a.toLowerCase())
  } catch (err) {
    console.error('[contractCalls.getConversations] Full error:', err)
    return []
  }
}

export async function getMessageCount(): Promise<number> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.messageReader,
      abi: messagesReaderAbi,
      functionName: 'getMessageCount',
    })
    return Number(result)
  } catch (err) {
    console.error('[contractCalls.getMessageCount] Full error:', err)
    return 0
  }
}

// ============================================================
//  MESSAGES — writes
// ============================================================

export async function sendMessage(
  recipient: `0x${string}`,
  content: string
) {
  // Try session key first (no MetaMask popup)
  const session = getActiveLocalSession()
  if (session) {
    const sessionClient = getSessionWalletClient()
    if (sessionClient) {
      try {
        const hash = await sessionClient.writeContract({
          chain: qfChain,
          address: CONTRACT_ADDRESSES.messageWriterV2,
          abi: messagesWriterV2Abi,
          functionName: 'sendMessage',
          args: [recipient, content],
        })
        return waitReceipt(hash, 'sendMessage')
      } catch (err) {
        const raw = decodeContractError(err)
        console.error('[sendMessage:session] Raw contract error:', raw, err)
        throw new Error(getContractErrorMessage(err))
      }
    }
  }

  // Fallback: MetaMask popup
  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: CONTRACT_ADDRESSES.messageWriter,
      abi: messagesWriterAbi,
      functionName: 'sendMessage',
      args: [recipient, content],
    })
    return waitReceipt(hash, 'sendMessage')
  } catch (err) {
    const raw = decodeContractError(err)
    console.error('[sendMessage] Raw contract error:', raw, err)
    throw new Error(getContractErrorMessage(err))
  }
}

// ============================================================
//  MESSAGE HELPERS (backward-compatible wrappers)
// ============================================================

export async function sendPodMessageChunked(podId: number, content: string) {
  // Resolve sender address: use session owner if active, otherwise wallet
  const session = getActiveLocalSession()
  let senderAddress: string

  if (session) {
    senderAddress = session.ownerAddress.toLowerCase()
  } else {
    const walletClient = await getWalletClient()
    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')
    senderAddress = account.toLowerCase()
  }

  await sendPodMessage(podId, content)

  return {
    id: `${podId}-${Date.now()}`,
    podId,
    sender: senderAddress,
    content,
    timestamp: Date.now(),
  }
}

export async function sendDirectMessageChunked(recipient: `0x${string}`, content: Uint8Array) {
  // Resolve sender address: use session owner if active, otherwise wallet
  const session = getActiveLocalSession()
  let senderAddress: string

  if (session) {
    senderAddress = session.ownerAddress.toLowerCase()
  } else {
    const walletClient = await getWalletClient()
    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')
    senderAddress = account.toLowerCase()
  }

  const textContent = new TextDecoder().decode(content)
  await sendMessage(recipient, textContent)

  return {
    id: `${senderAddress}-${Date.now()}`,
    sender: senderAddress,
    recipient: recipient.toLowerCase(),
    encryptedContent: content,
    decryptedContent: textContent,
    timestamp: Date.now(),
  }
}
