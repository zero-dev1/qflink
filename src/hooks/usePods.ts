import { useCallback, useRef, useEffect } from 'react'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import type { PodTier } from '@/types'
import * as cc from '@/lib/contractCalls'


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
    const { evmAddress } = useWalletStore.getState()
    if (!evmAddress) return
    setLoading(true)
    try {
      const podIds = await cc.getUserPods(evmAddress as `0x${string}`)
      // getUserPods returns number[], store expects Pod[] — trigger full fetch instead
      await fetchPods()
    } catch (err) {
      console.error('Failed to load my pods:', err)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setMyPods, fetchPods])

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
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const receipt = await cc.createPod(
          name, description, minBalance, entryFee,
          payoutWallet ? payoutWallet as `0x${string}` : undefined
        )
        addToast('success', `Pod "${name}" created successfully`)
        // Refresh pods list from chain to get the new pod
        await fetchPods()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create pod'
        addToast('error', msg)
      }
    },
    [addToast, addPod, fetchPods]
  )

  // Join a pod (handles paid pods and free pods)
  const joinPod = useCallback(
    async (podId: number, fee: bigint = BigInt(0)) => {
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        await cc.joinPod(podId, fee)
        addToast('success', 'Successfully joined pod')
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
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const result = await cc.sendPodMessageChunked(podId, content)
        addPodMessage({ ...result })
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
        const rawMessages = await cc.getPodMessages(podId, 0, 100)
        const { hexToBytes } = await import('viem')
        const formatted = rawMessages.map((msg, index) => {
          const bytes = hexToBytes(msg.contentHash)
          const content = new TextDecoder().decode(bytes).replace(/\0/g, '').trim()
          return {
            id: `${podId}-${msg.sender.substring(0, 8)}-${msg.timestamp}-${index}`,
            podId,
            sender: msg.sender,
            content,
            timestamp: msg.timestamp,
          }
        })
        setPodMessages(podId, formatted)
      } catch (err) {
        console.error('Failed to load pod messages:', err)
      }
    },
    [setPodMessages]
  )

  const loadPodMembers = useCallback(
    async (podId: number) => {
      try {
        const result = await cc.getPodMembers(podId)
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
        await cc.banMember(podId, memberAddress as `0x${string}`)
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
        await cc.unbanMember(podId, memberAddress as `0x${string}`)
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
        await cc.addMod(podId, moderatorAddress as `0x${string}`)
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
        await cc.removeMod(podId, moderatorAddress as `0x${string}`)
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
