/**
 * contractCalls.ts — viem-based contract interaction layer
 *
 * Replaces manual selector computation, SCALE/ABI encoding in contracts.ts.
 * All reads use publicClient.readContract, all writes use walletClient.writeContract.
 * This file coexists with contracts.ts during migration; nothing imports it yet.
 */

import {
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  type Hash,
  toHex,
  fromHex,
  hexToString,
  stringToHex,
} from 'viem'

import { getPublicClient, getWalletClient, CONTRACT_ADDRESSES, qfChain } from './viemClient'
import { registryAbi } from '@/abi/registry'
import { podsAbi } from '@/abi/pods'
import { messagesAbi } from '@/abi/messages'

// ── Helpers ──

/** Get the EVM provider (MetaMask window.ethereum or equivalent) */
function getProvider(): any {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum
  }
  throw new Error('No EIP-1193 provider found')
}

/** Get the connected EVM address from the wallet store */
async function getAccount(): Promise<`0x${string}`> {
  const { useWalletStore } = await import('@/stores/wallet')
  const { evmAddress } = useWalletStore.getState()
  if (!evmAddress) throw new Error('Wallet not connected or not mapped')
  return evmAddress as `0x${string}`
}

/** Create an on-demand wallet client for write operations */
function makeWalletClient(account: `0x${string}`) {
  return createWalletClient({
    chain: qfChain,
    transport: custom(getProvider()),
    account,
  })
}

/** Wait for a tx receipt after a write */
async function waitReceipt(hash: Hash) {
  const client = getPublicClient()
  return client.waitForTransactionReceipt({ hash })
}

// ============================================================
//  REGISTRY — reads
// ============================================================

export interface UserProfile {
  displayName: string
  encryptionPubkey: `0x${string}`
  registeredAt: bigint
}

export async function getProfile(address: `0x${string}`): Promise<UserProfile | null> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'get_profile',
      args: [address],
    })

    const [displayNameHex, encryptionPubkey, registeredAt] = result as [
      `0x${string}`,
      `0x${string}`,
      bigint,
    ]

    // Empty profile check: no display name or zero timestamp
    const displayName = hexToString(displayNameHex, { size: 32 }).replace(/\0/g, '').trim()
    if (!displayName || registeredAt === 0n) return null

    return { displayName, encryptionPubkey, registeredAt }
  } catch (err) {
    console.error('[contractCalls.getProfile] Error:', err)
    throw err
  }
}

export async function getUserCount(): Promise<bigint> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'get_user_count',
    })) as bigint
  } catch {
    return 0n
  }
}

export async function getLinkedWallets(primaryAddress: `0x${string}`): Promise<string[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'get_linked_wallets',
      args: [primaryAddress],
    })
    return (result as `0x${string}`[]).map((a) => a.toLowerCase())
  } catch {
    return []
  }
}

export async function getTotalBalance(primaryAddress: `0x${string}`): Promise<bigint> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: registryAbi,
      functionName: 'get_total_balance',
      args: [primaryAddress],
    })) as bigint
  } catch {
    return 0n
  }
}

// ============================================================
//  REGISTRY — writes
// ============================================================

export async function registerProfile(displayName: string, encryptionPubkey: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)
  const displayNameHex = stringToHex(displayName, { size: 32 }) as `0x${string}`

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'register',
    args: [displayNameHex, encryptionPubkey],
  })
  return waitReceipt(hash)
}

export async function updateProfile(displayName: string, encryptionPubkey: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)
  const displayNameHex = stringToHex(displayName, { size: 32 }) as `0x${string}`

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'update_profile',
    args: [displayNameHex, encryptionPubkey],
  })
  return waitReceipt(hash)
}

export async function linkWallet(linkedAddress: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)
  const emptySignature = '0x' as `0x${string}`

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'link_wallet',
    args: [linkedAddress, emptySignature],
  })
  return waitReceipt(hash)
}

export async function confirmLink(primaryAddress: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'confirm_link',
    args: [primaryAddress],
  })
  return waitReceipt(hash)
}

export async function unlinkWallet(linkedAddress: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'unlink_wallet',
    args: [linkedAddress],
  })
  return waitReceipt(hash)
}

// ============================================================
//  PODS — reads
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
  tier?: number
  entryFee?: bigint
  payoutWallet?: string
  memberCount?: number
}

export async function getPodCount(): Promise<number> {
  try {
    const client = getPublicClient()
    const count = (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_count',
    })) as bigint
    return Number(count)
  } catch {
    return 0
  }
}

export async function getPod(podId: number): Promise<PodData | null> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod',
      args: [BigInt(podId)],
    })

    const [id, nameHex, descHex, minBalance, creator, createdAt, isDefault, podType] = result as [
      bigint, `0x${string}`, `0x${string}`, bigint, `0x${string}`, bigint, boolean, number,
    ]

    const name = hexToString(nameHex, { size: 32 }).replace(/\0/g, '').trim()
    if (!name) return null

    const description = hexToString(descHex, { size: 256 }).replace(/\0/g, '').trim()

    // Fetch supplementary data in parallel
    const [tier, entryFee, memberCount] = await Promise.all([
      getPodTier(podId),
      getPodFee(podId),
      getPodMemberCount(podId),
    ])

    return {
      id,
      name,
      description,
      minBalance,
      creator: (creator as string).toLowerCase(),
      createdAt,
      isDefault,
      podType,
      tier,
      entryFee,
      memberCount,
    }
  } catch (err) {
    console.error(`[contractCalls.getPod] Error for pod ${podId}:`, err)
    return null
  }
}

export async function getAllPods(): Promise<PodData[]> {
  const count = await getPodCount()
  const pods: PodData[] = []
  for (let i = 0; i < count; i++) {
    const pod = await getPod(i)
    if (pod) pods.push(pod)
  }
  return pods
}

export async function getUserPods(address: `0x${string}`): Promise<number[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_user_pods',
      args: [address],
    })
    return (result as bigint[]).map(Number)
  } catch {
    return []
  }
}

export async function getPodMembers(podId: number): Promise<string[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_members',
      args: [BigInt(podId)],
    })
    return (result as `0x${string}`[]).map((a) => a.toLowerCase())
  } catch {
    return []
  }
}

export async function getPodMemberCount(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    const count = (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_member_count',
      args: [BigInt(podId)],
    })) as bigint
    return Number(count)
  } catch {
    return 0
  }
}

export async function checkPodAccess(
  podId: number,
  address: `0x${string}`
): Promise<{ granted: boolean; code: number }> {
  try {
    const client = getPublicClient()
    const code = (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'check_pod_access',
      args: [BigInt(podId), address],
    })) as number
    return { granted: code === 0, code }
  } catch {
    return { granted: false, code: 255 }
  }
}

export interface RawPodMessage {
  sender: string
  contentHash: `0x${string}`
  timestamp: number
}

export async function getPodMessages(
  podId: number,
  start = 0,
  limit = 100
): Promise<RawPodMessage[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_messages',
      args: [BigInt(podId), BigInt(start), BigInt(limit)],
    })

    const messages = result as Array<{
      sender: `0x${string}`
      content_hash: `0x${string}`
      timestamp: bigint
    }>

    return messages.map((m) => ({
      sender: m.sender.toLowerCase(),
      contentHash: m.content_hash,
      timestamp: Number(m.timestamp) * 1000,
    }))
  } catch (err) {
    console.error(`[contractCalls.getPodMessages] Error for pod ${podId}:`, err)
    return []
  }
}

export async function getPodTier(podId: number): Promise<number> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_tier',
      args: [BigInt(podId)],
    })) as number
  } catch {
    return 0
  }
}

export async function getPodFee(podId: number): Promise<bigint> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pod_fee',
      args: [BigInt(podId)],
    })) as bigint
  } catch {
    return 0n
  }
}

export async function getProFee(): Promise<bigint> {
  try {
    const client = getPublicClient()
    const fee = (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_pro_fee',
    })) as bigint
    if (fee === 0n) return parseEther('500') // fallback
    return fee
  } catch {
    return parseEther('500')
  }
}

export async function getTreasury(): Promise<string | null> {
  try {
    const client = getPublicClient()
    const addr = (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_treasury',
    })) as `0x${string}`
    return addr.toLowerCase()
  } catch {
    return null
  }
}

export async function hasPaid(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'has_paid',
      args: [BigInt(podId), address],
    })) as boolean
  } catch {
    return false
  }
}

// ── Moderation reads ──

export async function isBanned(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'is_banned',
      args: [BigInt(podId), address],
    })) as boolean
  } catch {
    return false
  }
}

export async function isGloballyBanned(address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'is_globally_banned',
      args: [address],
    })) as boolean
  } catch {
    return false
  }
}

export async function isMod(podId: number, address: `0x${string}`): Promise<boolean> {
  try {
    const client = getPublicClient()
    return (await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'is_mod',
      args: [BigInt(podId), address],
    })) as boolean
  } catch {
    return false
  }
}

export async function getMods(podId: number): Promise<string[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.pods,
      abi: podsAbi,
      functionName: 'get_mods',
      args: [BigInt(podId)],
    })
    return (result as `0x${string}`[]).map((a) => a.toLowerCase())
  } catch {
    return []
  }
}

// ============================================================
//  PODS — writes
// ============================================================

export async function createPod(
  name: string,
  description: string,
  minBalance: bigint,
  entryFee: bigint = 0n,
  payoutWallet?: `0x${string}`
) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const nameHex = stringToHex(name, { size: 32 }) as `0x${string}`
  const descHex = stringToHex(description, { size: 256 }) as `0x${string}`
  const payout = payoutWallet || account

  // Pro pods require creation fee
  let value = 0n
  if (entryFee > 0n) {
    value = await getProFee()
  }

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'create_pod',
    args: [nameHex, descHex, minBalance, entryFee, payout],
    value,
  })
  return waitReceipt(hash)
}

export async function joinPod(podId: number, fee: bigint = 0n) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'join_pod',
    args: [BigInt(podId)],
    value: fee,
  })
  return waitReceipt(hash)
}

export async function leavePod(podId: number) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'leave_pod',
    args: [BigInt(podId)],
  })
  return waitReceipt(hash)
}

export async function sendPodMessage(podId: number, contentHash: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'send_pod_message',
    args: [BigInt(podId), contentHash],
  })
  return waitReceipt(hash)
}

export async function upgradePod(podId: number, fee: bigint) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'upgrade_pod',
    args: [BigInt(podId)],
    value: fee,
  })
  return waitReceipt(hash)
}

// ── Moderation writes ──

export async function banMember(podId: number, target: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'ban_member',
    args: [BigInt(podId), target],
  })
  return waitReceipt(hash)
}

export async function unbanMember(podId: number, target: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'unban_member',
    args: [BigInt(podId), target],
  })
  return waitReceipt(hash)
}

export async function addMod(podId: number, moderator: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'add_mod',
    args: [BigInt(podId), moderator],
  })
  return waitReceipt(hash)
}

export async function removeMod(podId: number, moderator: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'remove_mod',
    args: [BigInt(podId), moderator],
  })
  return waitReceipt(hash)
}

export async function globalBan(target: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'global_ban',
    args: [target],
  })
  return waitReceipt(hash)
}

export async function globalUnban(target: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'global_unban',
    args: [target],
  })
  return waitReceipt(hash)
}

export async function setProFee(amount: bigint) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'set_pro_fee',
    args: [amount],
  })
  return waitReceipt(hash)
}

export async function setTreasury(addr: `0x${string}`) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.pods,
    abi: podsAbi,
    functionName: 'set_treasury',
    args: [addr],
  })
  return waitReceipt(hash)
}

// ============================================================
//  MESSAGES — reads
// ============================================================

export interface DirectMessageData {
  sender: string
  recipient: string
  contentHash: `0x${string}`
  timestamp: number
  nonce: `0x${string}`
}

export async function getMessages(
  addr1: `0x${string}`,
  addr2: `0x${string}`,
  start = 0,
  limit = 50
): Promise<DirectMessageData[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.messages,
      abi: messagesAbi,
      functionName: 'get_messages',
      args: [addr1, addr2, BigInt(start), BigInt(limit)],
    })

    const messages = result as Array<{
      sender: `0x${string}`
      recipient: `0x${string}`
      content_hash: `0x${string}`
      timestamp: bigint
      nonce: `0x${string}`
    }>

    return messages.map((m) => ({
      sender: m.sender.toLowerCase(),
      recipient: m.recipient.toLowerCase(),
      contentHash: m.content_hash,
      timestamp: Number(m.timestamp) * 1000,
      nonce: m.nonce,
    }))
  } catch {
    return []
  }
}

export async function getConversations(address: `0x${string}`): Promise<string[]> {
  try {
    const client = getPublicClient()
    const result = await client.readContract({
      address: CONTRACT_ADDRESSES.messages,
      abi: messagesAbi,
      functionName: 'get_conversations',
      args: [address],
    })
    return (result as `0x${string}`[]).map((a) => a.toLowerCase())
  } catch {
    return []
  }
}

export async function getMessageCount(
  addr1: `0x${string}`,
  addr2: `0x${string}`
): Promise<number> {
  try {
    const client = getPublicClient()
    const count = (await client.readContract({
      address: CONTRACT_ADDRESSES.messages,
      abi: messagesAbi,
      functionName: 'get_message_count',
      args: [addr1, addr2],
    })) as bigint
    return Number(count)
  } catch {
    return 0
  }
}

// ============================================================
//  MESSAGES — writes
// ============================================================

export async function sendMessage(
  recipient: `0x${string}`,
  contentHash: `0x${string}`,
  nonce: `0x${string}`
) {
  const account = await getAccount()
  const walletClient = makeWalletClient(account)

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.messages,
    abi: messagesAbi,
    functionName: 'send_message',
    args: [recipient, contentHash, nonce],
  })
  return waitReceipt(hash)
}

// ============================================================
//  MESSAGE CHUNKING (preserved from old contracts.ts)
// ============================================================

const CHUNK_MAGIC_BYTE = 0xff
const CHUNK_CONTENT_SIZE = 29
const CHUNK_HEADER_SIZE = 3

export function createMessageChunks(content: Uint8Array): Uint8Array[] {
  const totalChunks = Math.ceil(content.length / CHUNK_CONTENT_SIZE)

  if (totalChunks === 1 && content.length <= 29) {
    const chunk = new Uint8Array(32)
    chunk.set(content)
    return [chunk]
  }

  const chunks: Uint8Array[] = []
  for (let i = 0; i < totalChunks; i++) {
    const chunk = new Uint8Array(32)
    chunk[0] = CHUNK_MAGIC_BYTE
    chunk[1] = i
    chunk[2] = totalChunks
    const start = i * CHUNK_CONTENT_SIZE
    const end = Math.min(start + CHUNK_CONTENT_SIZE, content.length)
    chunk.set(content.slice(start, end), CHUNK_HEADER_SIZE)
    chunks.push(chunk)
  }
  return chunks
}

export function isChunkedMessage(contentHash: Uint8Array): boolean {
  if (contentHash[0] !== CHUNK_MAGIC_BYTE) return false
  const chunkIndex = contentHash[1]
  const totalChunks = contentHash[2]
  return totalChunks > 1 && totalChunks <= 20 && chunkIndex < totalChunks
}

/**
 * Send a pod message with automatic chunking for long content.
 * Each chunk is sent as a separate tx (sequential for EVM wallets).
 */
export async function sendPodMessageChunked(podId: number, content: string) {
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(content)
  const chunks = createMessageChunks(contentBytes)

  const account = await getAccount()

  for (let i = 0; i < chunks.length; i++) {
    const contentHash = toHex(chunks[i], { size: 32 }) as `0x${string}`
    await sendPodMessage(podId, contentHash)

    // Delay between chunks to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  return {
    id: `${podId}-${Date.now()}`,
    podId,
    sender: account.toLowerCase(),
    content,
    timestamp: Date.now(),
  }
}

/**
 * Send a direct message with automatic chunking for long content.
 */
export async function sendDirectMessageChunked(recipient: `0x${string}`, content: Uint8Array) {
  const chunks = createMessageChunks(content)
  const account = await getAccount()

  for (let i = 0; i < chunks.length; i++) {
    const contentHash = toHex(chunks[i], { size: 32 }) as `0x${string}`
    const nonce = toHex(new Uint8Array(24), { size: 24 }) as `0x${string}`
    await sendMessage(recipient, contentHash, nonce)

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  return {
    id: `${account}-${Date.now()}`,
    sender: account.toLowerCase(),
    recipient: recipient.toLowerCase(),
    encryptedContent: content,
    decryptedContent: new TextDecoder().decode(content),
    timestamp: Date.now(),
  }
}
