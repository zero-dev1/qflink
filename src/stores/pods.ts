import { create } from 'zustand'
import type { PodsState, Pod, PodMessage, DefaultPod } from '@/types'
import { getApi, type InjectedAccountWithMeta } from '@/lib/chain'
import { podsGetPodCount, podsGetPod, podsGetPodMessages, podsSendMessage, podsCheckAccess } from '@/lib/contracts'
import { useWalletStore } from './wallet'

// Helper to get EVM address from wallet store (for access checks)
const getEvmAddress = async (): Promise<string | null> => {
  const { useWalletStore } = await import('./wallet')
  return useWalletStore.getState().evmAddress
}

export const usePodsStore = create<PodsState>((set, get) => ({
  pods: [],
  myPods: [],
  defaultPods: [],
  activePod: null,
  podMessages: {},
  podMembers: {},
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
    set({
      podMessages: {
        ...state.podMessages,
        [message.podId]: [...existing, message],
      },
    })
  },

  setPodMessages: (podId: number, messages: PodMessage[]) => {
    console.log('[store] pod messages set, count:', messages.length, 'podId:', podId)
    set({ podMessages: { ...get().podMessages, [podId]: messages } })
  },

  setPodMembers: (podId: number, members: string[]) => {
    set({ podMembers: { ...get().podMembers, [podId]: members } })
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  fetchPods: async () => {
    // Prevent concurrent fetches
    if (get().isLoading) {
      console.log('📦 [fetchPods] Already fetching, skipping...')
      return
    }
    
    console.log('📦 [fetchPods] Starting pod fetch...')
    // Clear existing pods and set loading state
    set({ pods: [], defaultPods: [], myPods: [], isLoading: true })
    try {
      console.log('📦 [fetchPods] Awaiting fully ready API...')
      const api = await getApi()
      console.log('📦 [fetchPods] API ready, fetching pod count...')
      const count = await podsGetPodCount(api)
      console.log('📦 [fetchPods] Pod count:', count)
      
      const pods: Pod[] = []
      
      for (let i = 0; i < count; i++) {
        console.log(`Fetching pod ${i}...`)
        const pod = await podsGetPod(api, i)
        if (pod) {
          console.log(`✅ Pod ${i}:`, pod.name, 'minBalance:', pod.minBalance.toString())
          pods.push({
            id: Number(pod.id),
            name: pod.name,
            description: pod.description,
            minBalance: pod.minBalance,
            memberCount: 0,
            isDefault: pod.isDefault,
          } as any)
        } else {
          console.warn(`⚠️ Pod ${i} returned null`)
        }
      }
      
      const uniquePods = pods.filter((pod, index, self) => 
        self.findIndex(p => p.id === pod.id) === index
      )
      
      const defaultPods = uniquePods.filter(p => (p as any).isDefault) as DefaultPod[]
      const customPods = uniquePods.filter(p => !(p as any).isDefault)
      
      // Derive myPods from balance check (token-gated access)
      let myPods: Pod[] = []
      const evmAddress = await getEvmAddress()
      if (evmAddress) {
        const accessiblePods: Pod[] = []
        for (const pod of uniquePods) {
          try {
            const hasAccess = await podsCheckAccess(api, pod.id, evmAddress)
            if (hasAccess) {
              accessiblePods.push(pod)
            }
          } catch (err) {
            console.warn(`Failed to check access for pod ${pod.id}:`, err)
          }
        }
        myPods = accessiblePods
        console.log(`🔓 Access check complete: ${myPods.length} pods accessible`)
      }
      
      // Deduplicate myPods by ID to prevent duplicates in sidebar
      const uniqueMyPods = [...new Map(myPods.map(p => [p.id, p])).values()]
      console.log('[fetchPods] all pods from contract:', pods.map(p => ({ id: p.id, name: p.name })))
      console.log('[fetchPods] defaultPods:', defaultPods.map(p => ({ id: p.id, name: p.name })))
      console.log('[fetchPods] myPods before dedup:', myPods.map(p => ({ id: p.id, name: p.name })))
      console.log(`✅ Fetched ${uniquePods.length} pods (${defaultPods.length} default, ${customPods.length} custom, ${uniqueMyPods.length} accessible)`)
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
      
      const api = await getApi()
      const messages = await podsGetPodMessages(api, podId, 0, 100)
      
      const formatted: PodMessage[] = messages.map(msg => ({
        id: `${podId}-${msg.timestamp}`,
        podId,
        sender: msg.sender,
        content: Array.from(msg.contentHash).map(b => b.toString(16).padStart(2, '0')).join(''),
        timestamp: Number(msg.timestamp),
      }))
      
      set({ podMessages: { ...get().podMessages, [podId]: formatted } })
    } catch (err) {
      console.error('Failed to fetch pod messages:', err)
    }
  },

  sendPodMessage: async (podId: number, content: string) => {
    const { address, walletSource, evmAddress } = useWalletStore.getState()
    if (!address || !walletSource || !evmAddress) {
      throw new Error('Wallet not connected or not mapped')
    }

    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    const account: InjectedAccountWithMeta = {
      address,
      meta: { source: walletSource },
      signer: injector.signer,
    }

    const api = await getApi()
    const contentHash = new Uint8Array(32)
    const encoder = new TextEncoder()
    const contentBytes = encoder.encode(content)
    contentHash.set(contentBytes.slice(0, 32))

    await podsSendMessage(api, account, podId, contentHash)
    
    const message: PodMessage = {
      id: `${podId}-${Date.now()}`,
      podId,
      sender: evmAddress,
      content,
      timestamp: Date.now(),
    }
    
    get().addPodMessage(message)
  },

  checkAccess: async (podId: number, address: string) => {
    try {
      const api = await getApi()
      return await podsCheckAccess(api, podId, address)
    } catch (err) {
      console.error('Failed to check pod access:', err)
      return false
    }
  },
}))
