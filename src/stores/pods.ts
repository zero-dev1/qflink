import { create } from 'zustand'
import { hexToBytes } from 'viem'
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

  setLoading: (loading: boolean) => set({ isLoading: loading }),



  fetchPods: async () => {
    set({ isLoading: true })
    try {
      const count = await cc.getPodCount()
      
      if (count === 0) {
        set({ pods: [], isLoading: false })
        return
      }
      
      const pods: Pod[] = []
      
      for (let i = 0; i < count; i++) {
        const pod = await cc.getPod(i)
        if (pod) {
          pods.push({
            id: Number(pod.id),
            name: pod.name,
            description: pod.description,
            minBalance: pod.minBalance,
            memberCount: pod.memberCount || 0,
            isDefault: pod.isDefault,
            creator: pod.creator,
            createdAt: pod.createdAt,
            tier: pod.tier === 1 ? 'pro' : 'free',
            entryFee: pod.entryFee || 0n,
            payoutWallet: pod.payoutWallet,
            category: 'trading',
            isActive: true,
            maxMembers: pod.tier === 1 ? Infinity : 50,
            joinMethod: 'balance',
          } as any)
        }
      }
      
      const uniquePods = pods.filter((pod, index, self) => 
        self.findIndex(p => p.id === pod.id) === index
      )
      
      const defaultPods = uniquePods.filter(p => (p as any).isDefault) as DefaultPod[]
      
      // Derive myPods from on-chain reverse index
      let myPods: Pod[] = []
      const evmAddress = getEvmAddress()
      
      if (evmAddress) {
        const userPodIds = await cc.getUserPods(evmAddress as `0x${string}`)
        
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
        
        // Only auto-add Chefs (pod 0) to sidebar
        const chefsPod = uniquePods.find(p => p.id === 0)
        if (chefsPod && !myPods.some(p => p.id === 0)) {
          try {
            const access = await cc.checkPodAccess(0, evmAddress as `0x${string}`)
            if (access.granted) {
              myPods.push(chefsPod)
            }
          } catch (err) {
            console.error('Failed to check Chefs pod access:', err)
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
      
      if ((pod as any).messageCount === 0) {
        set({ podMessages: { ...get().podMessages, [podId]: [] } })
        return
      }
      
      const rawMessages = await cc.getPodMessages(podId, 0, 100)
      
      // Decode contentHash bytes to text content
      const formatted: PodMessage[] = rawMessages.map((msg, index) => {
        // Convert hex contentHash to Uint8Array and decode as UTF-8
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
      
      set({ podMessages: { ...get().podMessages, [podId]: formatted } })
    } catch (err) {
      console.error('Failed to fetch pod messages:', err)
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
