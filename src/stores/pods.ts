import { create } from 'zustand'
import type { PodsState, Pod, PodMessage, DefaultPod } from '@/types'
import * as cc from '@/lib/contractCalls'
import { useWalletStore } from './wallet'

// Helper to get EVM address from wallet store (for access checks)
const getEvmAddress = (): string | null => {
  return useWalletStore.getState().evmAddress
}

export const usePodsStore = create<PodsState>((set, get) => ({
  pods: [],
  myPods: [],
  defaultPods: [],
  activePod: null,
  podMessages: {},
  podMembers: {},
  podMods: {},
  bannedAddresses: {},
  podMessageCounts: {},
  isLoading: false,

  setPods: (pods: Pod[]) => set({ pods }),
  setMyPods: (pods: Pod[]) => set({ myPods: pods }),
  setDefaultPods: (pods: DefaultPod[]) => set({ defaultPods: pods }),
  setActivePod: (id: number | null) => set({ activePod: id }),

  addPod: (pod: Pod) => {
    const state = get()
    set({
      pods: [...state.pods, pod],
      myPods: [...state.myPods, pod],
    })
  },

  addPodMessage: (message: PodMessage) => {
    const state = get()
    const existing = state.podMessages[message.podId] || []
    
    // Check for duplicate ID before adding
    const isDuplicate = existing.some(m => m.id === message.id)
    if (isDuplicate) {
      return
    }
    
    set({
      podMessages: {
        ...state.podMessages,
        [message.podId]: [...existing, message],
      },
    })
  },

  setPodMessages: (podId: number, messages: PodMessage[]) => {
    set({ podMessages: { ...get().podMessages, [podId]: messages } })
  },

  setPodMembers: (podId: number, members: string[]) => {
    set({ podMembers: { ...get().podMembers, [podId]: members } })
  },

  setPodMods: (podId: number, mods: string[]) => {
    set({ podMods: { ...get().podMods, [podId]: mods } })
  },

  setBannedAddresses: (podId: number, addresses: string[]) => {
    set({ bannedAddresses: { ...get().bannedAddresses, [podId]: addresses } })
  },

  setPodMessageCount: (podId: number, count: number) => {
    set({ podMessageCounts: { ...get().podMessageCounts, [podId]: count } })
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),



  fetchPods: async (blockNumber?: bigint) => {
    set({ isLoading: true })
    try {
      const count = await cc.getPodCount(blockNumber)
      
      if (count === 0) {
        set({ pods: [], isLoading: false })
        return
      }
      
      const pods: Pod[] = []
      
      for (let i = 1; i <= count; i++) {
        const [pod, entryFee] = await Promise.all([
          cc.getPod(i, blockNumber),
          cc.getEntryFee(i, blockNumber),
        ])
        if (pod) {
          pods.push({
            id: Number(pod.id),
            name: pod.name,
            description: pod.description,
            minBalance: pod.minBalance,
            memberCount: pod.memberCount || 0,
            // FIX: All pods from contract are user-created (custom), none are "default"
            isDefault: false,
            creator: pod.creator,
            createdAt: pod.createdAt,
            tier: pod.tier === 1 ? 'pro' : 'free',
            entryFee,
            payoutWallet: pod.payoutWallet,
            category: pod.category || 'trading',
            isActive: true,
            maxMembers: pod.tier === 1 ? Infinity : 50,
            joinMethod: 'balance',
          } as any)
        }
      }
      

      const uniquePods = pods.filter((pod, index, self) => 
        self.findIndex(p => p.id === pod.id) === index
      )
      
      // FIX: No default pods anymore - all pods from contract are user-created
      const defaultPods: DefaultPod[] = []
      
      // Derive myPods from on-chain reverse index
      let myPods: Pod[] = []
      const evmAddress = getEvmAddress()
      
      if (evmAddress) {
        const userPodIds = await cc.getUserPods(evmAddress as `0x${string}`, blockNumber)
        
        for (const podId of userPodIds) {
          const pod = uniquePods.find(p => p.id === podId)
          if (pod) {
            myPods.push(pod)
          }
        }
        
        // Also include pods where user is creator
        for (const pod of uniquePods) {
          const isCreator = (pod as any).creator?.toLowerCase() === evmAddress.toLowerCase()
          if (isCreator && !myPods.some(p => p.id === pod.id)) {
            myPods.push(pod)
          }
        }
      }
      
      // Deduplicate myPods by ID to prevent duplicates in sidebar
      const uniqueMyPods = [...new Map(myPods.map(p => [p.id, p])).values()]

      set({ pods: uniquePods, defaultPods, myPods: uniqueMyPods })
    } catch (err) {
      console.error('Failed to fetch pods:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPodMessages: async (podId: number) => {
    try {
      const pod = get().pods.find(p => p.id === podId)
      if (!pod) {
        console.warn(`Pod ${podId} not found, skipping message fetch`)
        return
      }
      
      const rawMessages = await cc.getPodMessages(podId, 0, 100)
      
      const formatted: PodMessage[] = rawMessages.map((msg) => ({
        id: `${podId}-${msg.id}`,
        podId,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
      }))
      
      set({ podMessages: { ...get().podMessages, [podId]: formatted } })
    } catch (err) {
      console.error('Failed to fetch pod messages:', err)
    }
  },

  fetchPodMessageCount: async (podId: number) => {
    try {
      const count = await cc.getPodMessageCount(podId)
      set({ podMessageCounts: { ...get().podMessageCounts, [podId]: count } })
      return count
    } catch (err) {
      console.error(`Failed to fetch message count for pod ${podId}:`, err)
      return 0
    }
  },

  sendPodMessage: async (podId: number, content: string) => {
    const { evmAddress } = useWalletStore.getState()
    if (!evmAddress) {
      throw new Error('Wallet not connected')
    }

    const result = await cc.sendPodMessageChunked(podId, content)
    
    const message: PodMessage = {
      id: result.id,
      podId: result.podId,
      sender: result.sender,
      content: result.content,
      timestamp: result.timestamp,
    }
    
    get().addPodMessage(message)
  },

  checkAccess: async (podId: number, address: string) => {
    try {
      return await cc.checkPodAccess(podId, address as `0x${string}`)
    } catch (err) {
      console.error('Failed to check pod access:', err)
      return { granted: false, code: 255 }
    }
  },

  fetchPodMods: async (podId: number) => {
    try {
      const mods = await cc.getMods(podId)
      set({ podMods: { ...get().podMods, [podId]: mods } })
      return mods
    } catch (err) {
      console.error('Failed to fetch pod mods:', err)
      return []
    }
  },

  checkIsBanned: async (podId: number, address: string) => {
    try {
      const [banned, globallyBanned] = await Promise.all([
        cc.isBanned(podId, address as `0x${string}`),
        cc.isGloballyBanned(address as `0x${string}`)
      ])
      return { isBanned: banned, isGloballyBanned: globallyBanned }
    } catch (err) {
      console.error('Failed to check ban status:', err)
      return { isBanned: false, isGloballyBanned: false }
    }
  },

  checkHasPaid: async (podId: number, address: string) => {
    try {
      return await cc.hasPaid(podId, address as `0x${string}`)
    } catch (err) {
      console.error('Failed to check payment status:', err)
      return false
    }
  },
}))
