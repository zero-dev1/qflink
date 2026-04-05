import { create } from 'zustand';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { useUnreadStore } from '@/stores/unread';
import { deriveEVMAddress, getCurrentConnection } from '@/lib/wallet';
import {
  getAllPods,
  getPod,
  getUserPods,
  joinPod as contractJoinPod,
  isMember,
  getPodMessages,
  sendPodMessage as contractSendPodMessage,
  getPodMessageCount,
} from '@/lib/contractCalls';
import { hapticSuccess, chimeSuccess, hapticTap, hapticError } from '@/lib/feedback';

export interface PodData {
  id: bigint;
  name: string;
  description: string;
  minBalance: bigint;
  creator: string;
  createdAt: bigint;
  isDefault: boolean;
  podType: number;
  tier: number;
  memberCount: number;
  isPublic: boolean;
  threshold: bigint;
  modCount: number;
  category: string;
}

export interface RawPodMessage {
  sender: string;
  content: string;
  timestamp: number;
  id: number;
  isOptimistic?: boolean;
}

interface PodsStore {
  // Data
  pods: PodData[];
  userPodIds: number[];
  messages: Record<number, RawPodMessage[]>;
  
  // Loading states
  isLoadingPods: boolean;
  isLoadingMessages: Record<number, boolean>;
  isJoining: number | null;
  isSending: boolean;
  
  // Error states
  podFetchError: boolean;
  messageFetchErrors: Record<number, boolean>;
  
  // Actions
  fetchPods: () => Promise<void>;
  fetchUserPods: () => Promise<void>;
  fetchMessages: (podId: number) => Promise<void>;
  joinPod: (podId: number) => Promise<boolean>;
  sendMessage: (podId: number, content: string) => Promise<boolean>;
  
  // Helpers
  getPodById: (id: number) => PodData | undefined;
  isUserMember: (podId: number) => boolean;
}

export const usePodsStore = create<PodsStore>((set, get) => ({
  // Data
  pods: [],
  userPodIds: [],
  messages: {},
  
  // Loading states
  isLoadingPods: false,
  isLoadingMessages: {},
  isJoining: null,
  isSending: false,
  
  // Error states
  podFetchError: false,
  messageFetchErrors: {},
  
  // Actions
  fetchPods: async () => {
    set({ isLoadingPods: true, podFetchError: false });
    try {
      const pods = await getAllPods();
      set({ pods, isLoadingPods: false });
    } catch (error) {
      console.error('Failed to fetch pods:', error);
      set({ isLoadingPods: false, podFetchError: true });
    }
  },
  
  fetchUserPods: async () => {
    try {
      const evmAddress = useWalletStore.getState().evmAddress;
      if (!evmAddress) return;
      
      const userPodIds = await getUserPods(evmAddress as `0x${string}`);
      set({ userPodIds });
    } catch (error) {
      console.error('Failed to fetch user pods:', error);
    }
  },
  
  fetchMessages: async (podId: number) => {
    set(state => ({
      isLoadingMessages: { ...state.isLoadingMessages, [podId]: true },
      messageFetchErrors: { ...state.messageFetchErrors, [podId]: false }
    }));
    
    try {
      const messages = await getPodMessages(podId);
      
      // Update unread tracking
      if (messages.length > 0) {
        const latestTimestamp = Math.max(...messages.map(m => Number(m.timestamp)));
        const lastSeen = useUnreadStore.getState().lastSeenPod[podId.toString()] || 0;
        const newCount = messages.filter(m => Number(m.timestamp) > lastSeen).length;
        useUnreadStore.getState().updatePodUnread(podId.toString(), latestTimestamp, newCount);
      }
      
      set(state => ({
        messages: { ...state.messages, [podId]: messages },
        isLoadingMessages: { ...state.isLoadingMessages, [podId]: false }
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set(state => ({
        isLoadingMessages: { ...state.isLoadingMessages, [podId]: false },
        messageFetchErrors: { ...state.messageFetchErrors, [podId]: true }
      }));
    }
  },
  
  joinPod: async (podId: number) => {
    set({ isJoining: podId });
    
    try {
      const result = await contractJoinPod(podId);
      await result.confirmation;
      
      useToastStore.getState().addToast("success", "You're in");
      
      // Haptic and sound feedback
      hapticSuccess();
      chimeSuccess();
      
      // Mark getting started step
      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasJoinedPod');
      } catch {}
      
      await get().fetchUserPods();
      set({ isJoining: null });
      return true;
    } catch (error) {
      console.error('Failed to join pod:', error);
      useToastStore.getState().addToast("error", "Failed to join pod");
      set({ isJoining: null });
      return false;
    }
  },
  
  sendMessage: async (podId: number, content: string) => {
    const evmAddress = useWalletStore.getState().evmAddress;
    if (!evmAddress) return false;
    
    // 1. OPTIMISTIC INSERT — synchronous, happens BEFORE any await
    const optimisticId = Date.now(); // large number = optimistic marker
    const optimisticMessage: RawPodMessage = {
      id: optimisticId,
      sender: evmAddress,
      content,
      timestamp: Math.floor(Date.now() / 1000), // seconds for chain consistency
      isOptimistic: true,
    };
    
    set(state => ({
      messages: {
        ...state.messages,
        [podId]: [...(state.messages[podId] || []), optimisticMessage]
      }
    }));
    
    // Haptic feedback for message send
    hapticTap();
    
    set({ isSending: true });
    
    try {
      // 2. Contract write — this is the slow part
      const result = await contractSendPodMessage(podId, content);
      await result.confirmation;
      
      // 3. Success — mark confirmed (remove isOptimistic or refetch)
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).map((m) =>
            m.id === optimisticId ? { ...m, isOptimistic: false } : m
          ),
        },
        isSending: false,
      }));
      
      // Mark getting started step
      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasSentMessage');
      } catch {}
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // 4. Rollback — remove the optimistic message
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).filter((m) => m.id !== optimisticId),
        },
        isSending: false,
      }));
      
      useToastStore.getState().addToast("error", "Failed to send message");
      
      // Haptic feedback for error
      hapticError();
      
      return false;
    }
  },
  
  // Helpers
  getPodById: (id: number) => {
    const { pods } = get();
    return pods.find(pod => Number(pod.id) === id);
  },
  
  isUserMember: (podId: number) => {
    const { userPodIds } = get();
    return userPodIds.includes(podId);
  },
}));
