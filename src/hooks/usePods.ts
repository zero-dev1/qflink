import { useCallback, useRef, useEffect } from 'react'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'

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
  const fetchPodMods = usePodsStore((s) => s.fetchPodMods)

  const walletAddress = useWalletStore((s) => s.address)
  const walletBalance = useWalletStore((s) => s.balance)
  const refreshBalance = useWalletStore((s) => s.refreshBalance)
  const addToast = useUIStore((s) => s.addToast)

  const walletAddressRef = useRef(walletAddress)
  walletAddressRef.current = walletAddress
  const walletBalanceRef = useRef(walletBalance)
  walletBalanceRef.current = walletBalance

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
  }, [setLoading, fetchPods])

  const createPod = useCallback(
    async (
      name: string,
      description: string,
      minBalance: bigint,
      isPublic: boolean,
      entryFee: bigint = BigInt(0),
      payoutWallet: string = '',
      category: string = 'trading'
    ) => {
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      try {
        const CREATION_FEE = 500000000000000000000n // 500 QF
        let receipt
        if (entryFee > 0n) {
          receipt = await cc.createPaidPod(
            name,
            isPublic,
            minBalance,
            entryFee,
            CREATION_FEE,
            category,
            description
          )
        } else {
          receipt = await cc.createPod(
            name,
            description,
            minBalance,
            entryFee,
            payoutWallet ? payoutWallet as `0x${string}` : undefined,
            category
          )
        }
        addToast('success', `Pod "${name}" created successfully`)

        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create pod'
        addToast('error', msg)
        throw err
      }
    },
    [addToast, addPod, fetchPods, refreshBalance]
  )

  // Join a pod (handles paid pods and free pods)
  const joinPod = useCallback(
    async (podId: number, fee: bigint = BigInt(0)) => {
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return false
      }
      
      // Check if user is banned before attempting to join
      try {
        const isBanned = await cc.isBanned(podId, evmAddress as `0x${string}`)
        if (isBanned) {
          addToast('error', 'You are banned from this pod')
          return false
        }
      } catch (err) {
        console.error('Failed to check ban status:', err)
      }
      
      try {
        const receipt = await cc.joinPod(podId, fee)
        addToast('success', 'Successfully joined pod')
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join pod'
        addToast('error', msg)
        return false
      }
    },
    [addToast, fetchPods, refreshBalance]
  )

  const leavePod = useCallback(
    async (podId: number) => {
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      
      // Get pod name before leaving for the toast message
      const state = usePodsStore.getState()
      const pod = state.myPods.find(p => p.id === podId)
      const podName = pod?.name || 'the pod'
      
      try {
        const receipt = await cc.leavePod(podId)
        addToast('success', `You have left ${podName}`)
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        
        // Optimistic removal: remove pod from myPods immediately
        const currentMyPods = usePodsStore.getState().myPods
        const updatedMyPods = currentMyPods.filter(p => p.id !== podId)
        usePodsStore.setState({ myPods: updatedMyPods })
        
        // Delay before fetching to ensure contract state is updated (same pattern as rejoin)
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to leave pod'
        addToast('error', msg)
        throw err
      }
    },
    [addToast, fetchPods, refreshBalance]
  )

  const sendPodMessage = useCallback(
    async (podId: number, content: string) => {
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }
      
      // Check pod access before sending (handles banned users)
      try {
        const hasAccess = await cc.checkPodAccess(podId, evmAddress as `0x${string}`)
        if (!hasAccess.granted) {
          // Check if banned specifically
          const isBanned = await cc.isBanned(podId, evmAddress as `0x${string}`)
          if (isBanned) {
            addToast('error', 'You have been banned from this pod')
          } else {
            addToast('error', 'You no longer have access to this pod')
          }
          // Immediately remove from local state (don't fetchPods - it could re-add the pod)
          usePodsStore.setState((state) => ({
            myPods: state.myPods.filter((p) => p.id !== podId),
          }))
          // Navigation will be handled by PodsPage.tsx catching ACCESS_DENIED
          throw new Error('ACCESS_DENIED')
        }
      } catch (err) {
        // If it's our ACCESS_DENIED error, rethrow it
        if (err instanceof Error && err.message === 'ACCESS_DENIED') {
          throw err
        }
        // Otherwise log but continue (network errors shouldn't block sending)
        console.error('Failed to check pod access:', err)
      }
      
      try {
        const result = await cc.sendPodMessageChunked(podId, content)
        addPodMessage({ ...result })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message'
        addToast('error', msg)
        throw err
      }
    },
    [addToast, addPodMessage, fetchPods]
  )

  const loadPodMessages = useCallback(
    async (podId: number) => {
      try {
        const rawMessages = await cc.getPodMessages(podId, 0, 100)
        const formatted = rawMessages.map((msg) => ({
          id: `${podId}-${msg.id}`,
          podId,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
        }))
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

  // Moderation functions with proper refresh
  const banMember = useCallback(
    async (podId: number, memberAddress: string) => {
      try {
        const receipt = await cc.banMember(podId, memberAddress as `0x${string}`)
        addToast('success', 'Member banned')
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
        // Refresh members list if available
        await loadPodMembers(podId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to ban member'
        addToast('error', msg)
      }
    },
    [addToast, fetchPods, loadPodMembers, refreshBalance]
  )

  const unbanMember = useCallback(
    async (podId: number, memberAddress: string) => {
      try {
        const receipt = await cc.unbanMember(podId, memberAddress as `0x${string}`)
        addToast('success', 'Member unbanned')
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unban member'
        addToast('error', msg)
      }
    },
    [addToast, fetchPods, refreshBalance]
  )

  const addMod = useCallback(
    async (podId: number, moderatorAddress: string) => {
      try {
        const receipt = await cc.addMod(podId, moderatorAddress as `0x${string}`)
        addToast('success', 'Moderator added')
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
        await fetchPodMods(podId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add moderator'
        addToast('error', msg)
      }
    },
    [addToast, fetchPods, fetchPodMods, refreshBalance]
  )

  const removeMod = useCallback(
    async (podId: number, moderatorAddress: string) => {
      try {
        const receipt = await cc.removeMod(podId, moderatorAddress as `0x${string}`)
        addToast('success', 'Moderator removed')
        // Wait for confirmation
        if (receipt?.confirmation) {
          await receipt.confirmation
        }
        // Small delay for state to settle
        await new Promise(r => setTimeout(r, 1000))
        await fetchPods()
        await refreshBalance()
        await fetchPodMods(podId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove moderator'
        addToast('error', msg)
      }
    },
    [addToast, fetchPods, fetchPodMods, refreshBalance]
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
