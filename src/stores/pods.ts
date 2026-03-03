import { create } from 'zustand'
import type { PodsState, Pod, PodMessage, DefaultPod } from '@/types'
import { getApi, type InjectedAccountWithMeta } from '@/lib/chain'
import { 
  podsGetPodCount, 
  podsGetPod, 
  podsGetPodMessages, 
  sendPodMessageOnChain, 
  podsCheckAccess,
  podsIsBanned,
  podsIsGloballyBanned,
  podsGetMods,
  podsHasPaid,
} from '@/lib/contracts'
import { useWalletStore } from './wallet'

// Helper to get EVM address from wallet store (for access checks)
const getEvmAddress = async (): Promise<string | null> => {
  const { useWalletStore } = await import('./wallet')
  return useWalletStore.getState().evmAddress
}

// LocalStorage key for joined pods
const JOINED_PODS_KEY = 'qflink_joined_pods'

// Load joined pods from localStorage
const loadJoinedPods = (): Set<number> => {
  try {
    const stored = localStorage.getItem(JOINED_PODS_KEY)
    if (stored) {
      const arr = JSON.parse(stored) as number[]
      return new Set(arr)
    }
  } catch (err) {
    // Silently handle localStorage errors
  }
  return new Set()
}

// Save joined pods to localStorage
const saveJoinedPods = (joinedPods: Set<number>) => {
  try {
    const arr = Array.from(joinedPods)
    localStorage.setItem(JOINED_PODS_KEY, JSON.stringify(arr))
  } catch (err) {
    // Silently handle localStorage errors
  }
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
  joinedPods: loadJoinedPods(),

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

  joinPod: (podId: number) => {
    const state = get()
    const newJoinedPods = new Set(state.joinedPods)
    newJoinedPods.add(podId)
    saveJoinedPods(newJoinedPods)
    set({ joinedPods: newJoinedPods })
  },

  hasJoined: (podId: number): boolean => {
    return get().joinedPods.has(podId)
  },

  fetchPods: async () => {
    // Prevent concurrent fetches
    if (get().isLoading) {
      return
    }
    
    // Clear existing pods and set loading state
    set({ pods: [], defaultPods: [], myPods: [], isLoading: true })
    try {
      const api = await getApi()
      const count = await podsGetPodCount(api)
      
      if (count === 0) {
        set({ pods: [], isLoading: false })
        return
      }
      
      const pods: Pod[] = []
      
      for (let i = 0; i < count; i++) {
        const pod = await podsGetPod(api, i)
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
      const customPods = uniquePods.filter(p => !(p as any).isDefault)
      
      // Derive myPods from:
      // 1. User is creator
      // 2. User has joined (localStorage)
      // 3. User meets balance threshold (existing logic)
      // 4. User has paid (on-chain check)
      let myPods: Pod[] = []
      const evmAddress = await getEvmAddress()
      const joinedPods = get().joinedPods
      
      if (evmAddress) {
        // Sync on-chain paid status: if user has paid for a pod, add it to joinedPods
        for (const pod of uniquePods) {
          try {
            const entryFee = (pod as any).entryFee || 0n
            if (entryFee > 0n && !joinedPods.has(pod.id)) {
              const hasPaid = await podsHasPaid(pod.id, evmAddress)
              if (hasPaid) {
                get().joinPod(pod.id)
              }
            }
          } catch (err) {
            console.error(`Failed to sync paid status for pod ${pod.id}:`, err)
          }
        }

        // Refresh joinedPods after sync
        const updatedJoinedPods = get().joinedPods

        // myPods = pods where user is creator OR user has explicitly joined
        myPods = uniquePods.filter(pod => {
          const isCreator = (pod as any).creator?.toLowerCase() === evmAddress.toLowerCase()
          const hasJoined = updatedJoinedPods.has(pod.id)
          return isCreator || hasJoined
        })
      }
      
      // Deduplicate myPods by ID to prevent duplicates in sidebar
      const uniqueMyPods = [...new Map(myPods.map(p => [p.id, p])).values()]
      
      set({ pods: uniquePods, defaultPods, myPods: uniqueMyPods })
    } catch (err) {
      console.error('❌ Failed to fetch pods:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPodMessages: async (podId: number) => {
    try {
      // Check if pod exists and has message count
      const pod = get().pods.find(p => p.id === podId)
      if (!pod) {
        console.warn(`Pod ${podId} not found, skipping message fetch`)
        return
      }
      
      // Skip fetching if pod has 0 messages (if messageCount is available)
      if ((pod as any).messageCount === 0) {
        console.log(`Pod ${podId} has 0 messages, skipping fetch`)
        set({ podMessages: { ...get().podMessages, [podId]: [] } })
        return
      }
      
      console.log('[podStore] fetchPodMessages starting for pod:', podId)
      const api = await getApi()
      const messages = await podsGetPodMessages(api, podId, 0, 100)
      
      console.log('[podStore] messages from contracts:', messages.length)
      console.log('[podStore] messages before processing:', messages.map((m, i) => ({
        index: i,
        sender: m.sender?.substring(0, 10),
        contentPreview: m.content?.substring(0, 30),
        timestamp: m.timestamp
      })))
      
      const formatted: PodMessage[] = messages.map((msg, index) => ({
        id: msg.id || `${podId}-${msg.sender?.substring(0, 8)}-${msg.timestamp}-${index}`,
        podId,
        sender: msg.sender,
        content: msg.content,  // Use decoded content directly, NOT contentHash hex
        timestamp: Number(msg.timestamp),
      }))
      
      console.log('[podStore] messages after processing:', formatted.length)
      console.log('[podStore] formatted messages:', formatted.map((m, i) => ({
        index: i,
        id: m.id,
        sender: m.sender?.substring(0, 10),
        contentPreview: m.content?.substring(0, 30),
        timestamp: m.timestamp
      })))
      
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

    // Use sendPodMessageOnChain which handles chunking for long messages
    const result = await sendPodMessageOnChain(podId, evmAddress, content)
    
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
      const api = await getApi()
      return await podsCheckAccess(api, podId, address)
    } catch (err) {
      console.error('Failed to check pod access:', err)
      return { granted: false, code: 255 }
    }
  },

  fetchPodMods: async (podId: number) => {
    try {
      const mods = await podsGetMods(podId)
      set({ podMods: { ...get().podMods, [podId]: mods } })
      return mods
    } catch (err) {
      console.error('Failed to fetch pod mods:', err)
      return []
    }
  },

  checkIsBanned: async (podId: number, address: string) => {
    try {
      const [isBanned, isGloballyBanned] = await Promise.all([
        podsIsBanned(podId, address),
        podsIsGloballyBanned(address)
      ])
      return { isBanned, isGloballyBanned }
    } catch (err) {
      console.error('Failed to check ban status:', err)
      return { isBanned: false, isGloballyBanned: false }
    }
  },

  checkHasPaid: async (podId: number, address: string) => {
    try {
      return await podsHasPaid(podId, address)
    } catch (err) {
      console.error('Failed to check payment status:', err)
      return false
    }
  },
}))
