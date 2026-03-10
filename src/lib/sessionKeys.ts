import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http, type Hex, type Address } from 'viem'
import { getPublicClient, getWalletClient, CONTRACT_ADDRESSES, qfChain } from './viemClient'
import { sessionKeysAbi } from '@/abi/sessionKeys'

const SESSION_STORAGE_KEY = 'qflink-session-key'
const SESSION_META_KEY = 'qflink-session-meta'

interface SessionMeta {
  sessionAddress: Address
  ownerAddress: Address
  expiry: number
  createdAt: number
}

export function getActiveLocalSession(): SessionMeta | null {
  try {
    const meta = sessionStorage.getItem(SESSION_META_KEY)
    if (!meta) return null

    const parsed: SessionMeta = JSON.parse(meta)

    if (Date.now() > parsed.expiry) {
      clearLocalSession()
      return null
    }

    const pk = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!pk) {
      clearLocalSession()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearLocalSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_META_KEY)
}

export function getSessionWalletClient() {
  const pk = sessionStorage.getItem(SESSION_STORAGE_KEY) as Hex | null
  if (!pk) return null

  const meta = getActiveLocalSession()
  if (!meta) return null

  const account = privateKeyToAccount(pk)

  return createWalletClient({
    account,
    chain: qfChain,
    transport: http(qfChain.rpcUrls.default.http[0]),
  })
}

export async function createSession(
  durationSeconds: number,
  gasFunding: bigint = 50000000000000000n
): Promise<SessionMeta> {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  const walletClient = await getWalletClient()
  const [ownerAddress] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.sessionKeys,
    abi: sessionKeysAbi,
    functionName: 'registerSessionKey',
    args: [account.address, BigInt(durationSeconds)],
    value: gasFunding,
    account: ownerAddress,
    chain: qfChain,
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash })

  const meta: SessionMeta = {
    sessionAddress: account.address,
    ownerAddress,
    expiry: Date.now() + (durationSeconds * 1000),
    createdAt: Date.now(),
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, privateKey)
  sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta))

  return meta
}

export async function revokeSession(): Promise<void> {
  try {
    const walletClient = await getWalletClient()
    const [ownerAddress] = await walletClient.getAddresses()

    await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.sessionKeys,
      abi: sessionKeysAbi,
      functionName: 'revokeSession',
      account: ownerAddress,
      chain: qfChain,
    })
  } catch (e) {
    console.warn('Revoke failed (session may have expired):', e)
  }

  clearLocalSession()
}

export async function validateSessionOnChain(sessionAddress: Address): Promise<boolean> {
  const publicClient = getPublicClient()
  const [valid] = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.sessionKeys,
    abi: sessionKeysAbi,
    functionName: 'validateSession',
    args: [sessionAddress],
  }) as [boolean, Address]

  return valid
}

export function getSessionTimeRemaining(): number {
  const meta = getActiveLocalSession()
  if (!meta) return 0
  return Math.max(0, Math.floor((meta.expiry - Date.now()) / 1000))
}

export function isSessionExpiringSoon(): boolean {
  const remaining = getSessionTimeRemaining()
  return remaining < 300 && remaining > 0
}
