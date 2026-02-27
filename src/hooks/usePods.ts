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
    async (name: string, description: string, minBalance: bigint, isPublic: boolean, tier: PodTier = 'standard') => {
      const addr = walletAddressRef.current
      if (!addr) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const pod = await createPodOnChain(addr, name, description, minBalance, isPublic, tier)
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

  // Token-gated pods: membership is automatic based on balance
  // joinPod/leavePod are kept for future invite-only pods, but currently just refresh
  const joinPod = useCallback(
    async (podId: number) => {
      // Refresh pods to get current access state
      await fetchPods()
    },
    [fetchPods]
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
  }
}
