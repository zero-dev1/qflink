import { useCallback, useRef, useEffect } from 'react'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import type { PodTier } from '@/types'
import {
  createPodOnChain,
  sendPodMessageOnChain,
  decryptPodMessage,
  getUserPods,
  getPodMessages,
  getPodMembers,
  podsBanMember,
  podsUnbanMember,
  podsAddMod,
  podsRemoveMod,
  podsIsBanned,
  podsGetMods,
  podsJoinPod,
  podsGetPodFee,
  podsGetProFee,
  podsUpgradePod,
} from '@/lib/contracts'


export function usePods() {
  const pods = usePodsStore((s) => s.pods)
  const myPods = usePodsStore((s) => s.myPods)
  const defaultPods = usePodsStore((s) => s.defaultPods)
  const activePod = usePodsStore((s) => s.activePod)
  const podMessages = usePodsStore((s) => s.podMessages)
  const podMembers = usePodsStore((s) => s.podMembers)
  const isLoading = usePodsStore((s) => s.isLoading)
  const setActivePod = usePodsStore((s) => s.setActivePod)
  const setLoading = usePodsStore((s) => s.setLoading)
  const setMyPods = usePodsStore((s) => s.setMyPods)
  const fetchPods = usePodsStore((s) => s.fetchPods)
  const setDefaultPods = usePodsStore((s) => s.setDefaultPods)
  const addPod = usePodsStore((s) => s.addPod)
  const addPodMessage = usePodsStore((s) => s.addPodMessage)
  const setPodMessages = usePodsStore((s) => s.setPodMessages)
  const setPodMembers = usePodsStore((s) => s.setPodMembers)

  const walletAddress = useWalletStore((s) => s.address)
  const walletBalance = useWalletStore((s) => s.balance)
  const linkedWallets = useWalletStore((s) => s.linkedWallets)
  const addToast = useUIStore((s) => s.addToast)

  const walletAddressRef = useRef(walletAddress)
  walletAddressRef.current = walletAddress
  const walletBalanceRef = useRef(walletBalance)
  walletBalanceRef.current = walletBalance
  const linkedWalletsRef = useRef(linkedWallets)
  linkedWalletsRef.current = linkedWallets

  // Unified fetch path: loadPublicPods now uses fetchPods from the store
  // This eliminates the duplicate fetch path that was causing pod duplication
  const loadPublicPods = useCallback(async () => {
    await fetchPods()
  }, [fetchPods])

  const loadMyPods = useCallback(async () => {
    const addr = walletAddressRef.current
    if (!addr) return
    setLoading(true)
    try {
      const result = await getUserPods(addr)
      setMyPods(result)
    } catch (err) {
      console.error('Failed to load my pods:', err)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setMyPods])

  const createPod = useCallback(
    async (
      name: string, 
      description: string, 
      minBalance: bigint, 
      isPublic: boolean, 
      tier: 'free' | 'pro' = 'free',
      entryFee: bigint = BigInt(0),
      payoutWallet: string = ''
    ) => {
      const addr = walletAddressRef.current
      if (!addr) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const pod = await createPodOnChain(addr, name, description, minBalance, isPublic, tier, entryFee, payoutWallet)
        addPod(pod)
        addToast('success', `Pod "${name}" created successfully`)
        return pod
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create pod'
        addToast('error', msg)
      }
    },
    [addToast, addPod]
  )

  // Join a pod (handles paid pods and free pods)
  const joinPod = useCallback(
    async (podId: number, fee: bigint = BigInt(0)) => {
      const addr = walletAddressRef.current
      if (!addr) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        await podsJoinPod(podId, fee)
        addToast('success', 'Successfully joined pod')
        // Refresh pods to update state from on-chain
        await fetchPods()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join pod'
        addToast('error', msg)
      }
    },
    [addToast, fetchPods]
  )

  const leavePod = useCallback(
    async (podId: number) => {
      // Token-gated pods: access is based on balance, can't manually leave
      // Refresh to get current state
      await fetchPods()
    },
    [fetchPods]
  )

  const sendPodMessage = useCallback(
    async (podId: number, content: string) => {
      const addr = walletAddressRef.current
      if (!addr) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const message = await sendPodMessageOnChain(podId, addr, content)
        // Immediately decrypt so the message shows plaintext without re-fetching
        const decrypted = decryptPodMessage(podId, message.content)
        addPodMessage({ ...message, content: decrypted })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message'
        addToast('error', msg)
      }
    },
    [addToast, addPodMessage]
  )

  const loadPodMessages = useCallback(
    async (podId: number) => {
      try {
        const result = await getPodMessages(podId)
        setPodMessages(podId, result)
      } catch (err) {
        console.error('Failed to load pod messages:', err)
      }
    },
    [setPodMessages]
  )

  const loadPodMembers = useCallback(
    async (podId: number) => {
      try {
        const result = await getPodMembers(podId)
        setPodMembers(podId, result)
      } catch (err) {
        console.error('Failed to load pod members:', err)
      }
    },
    [setPodMembers]
  )

  // Moderation functions
  const banMember = useCallback(
    async (podId: number, memberAddress: string) => {
      try {
        await podsBanMember(podId, memberAddress)
        addToast('success', 'Member banned')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to ban member'
        addToast('error', msg)
      }
    },
    [addToast]
  )

  const unbanMember = useCallback(
    async (podId: number, memberAddress: string) => {
      try {
        await podsUnbanMember(podId, memberAddress)
        addToast('success', 'Member unbanned')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unban member'
        addToast('error', msg)
      }
    },
    [addToast]
  )

  const addMod = useCallback(
    async (podId: number, moderatorAddress: string) => {
      try {
        await podsAddMod(podId, moderatorAddress)
        addToast('success', 'Moderator added')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add moderator'
        addToast('error', msg)
      }
    },
    [addToast]
  )

  const removeMod = useCallback(
    async (podId: number, moderatorAddress: string) => {
      try {
        await podsRemoveMod(podId, moderatorAddress)
        addToast('success', 'Moderator removed')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove moderator'
        addToast('error', msg)
      }
    },
    [addToast]
  )

  return {
    pods,
    myPods,
    defaultPods,
    activePod,
    podMessages,
    podMembers,
    isLoading,
    setActivePod,
    loadPublicPods,
    loadMyPods,
    createPod,
    joinPod,
    leavePod,
    sendPodMessage,
    loadPodMessages,
    loadPodMembers,
    banMember,
    unbanMember,
    addMod,
    removeMod,
  }
}
