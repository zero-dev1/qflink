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
  isBanned,
  checkPodAccess,
  getEntryFee,
  getPodMessages,
  sendPodMessage as contractSendPodMessage,
  getPodMessageCount,
} from '@/lib/contractCalls';
import { hapticSuccess, chimeSuccess, hapticTap, hapticError, hapticSend, hapticConfirm, chimeError } from '@/lib/feedback';
import { getContractErrorMessage } from '@/lib/contractErrors';

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
  isFailed?: boolean;
}

interface PodsStore {
  // Data
  pods: PodData[];
  userPodIds: number[];
  messages: Record<number, RawPodMessage[]>;
  
  // Loading states
  isLoadingPods: boolean;
  isLoadingMessages: Record<number, boolean>;
  isJoining: number | false;
  isSending: Record<number, boolean>;
  
  // Error states
  podFetchError: boolean;
  messageFetchErrors: Record<number, boolean>;
  
  // Actions
  fetchPods: () => Promise<void>;
  fetchUserPods: () => Promise<void>;
  fetchMessages: (podId: number) => Promise<void>;
  joinPod: (podId: number) => Promise<boolean>;
  sendMessage: (podId: number, content: string) => Promise<boolean>;
  retryMessage: (podId: number, messageId: number) => Promise<boolean>;
  dismissFailedMessage: (podId: number, messageId: number) => void;
  
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
  isJoining: false,
  isSending: {},
  
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
      
      // De-duplicate: if we have optimistic messages, remove them when a matching
      // on-chain message arrives (same sender + same content within 60s)
      const existing = get().messages[podId] || [];
      const optimistic = existing.filter((m) => m.isOptimistic);
      // Remove optimistic messages that now have a chain counterpart
      const remainingOptimistic = optimistic.filter((opt) => {
        if (opt.isFailed) return true; // Failed messages persist until retry/dismiss
        return !messages.some(
          (chain: RawPodMessage) =>
            chain.sender.toLowerCase() === opt.sender.toLowerCase() &&
            chain.content === opt.content &&
            Math.abs(chain.timestamp - opt.timestamp) < 60_000,
        );
      });
      const finalMessages = [...messages, ...remainingOptimistic];
      
      // Update unread tracking
      if (finalMessages.length > 0) {
        const latestTimestamp = Math.max(...finalMessages.map(m => Number(m.timestamp)));
        const lastSeen = useUnreadStore.getState().lastSeenPod[podId.toString()] || 0;
        const newCount = finalMessages.filter(m => Number(m.timestamp) > lastSeen).length;
        useUnreadStore.getState().updatePodUnread(podId.toString(), latestTimestamp, newCount);
      }
      
      set(state => ({
        messages: { ...state.messages, [podId]: finalMessages },
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
    const evmAddress = useWalletStore.getState().evmAddress;
    if (!evmAddress) {
      useToastStore.getState().addToast("error", "Wallet not connected");
      return false;
    }

    set({ isJoining: podId });

    try {
      // Pre-flight checks before spending gas
      const addr = evmAddress as `0x${string}`;

      // 1. Already a member?
      const alreadyMember = await isMember(podId, addr);
      if (alreadyMember) {
        useToastStore.getState().addToast("info", "You're already a member");
        set({ isJoining: false });
        return true;
      }

      // 2. Banned?
      const banned = await isBanned(podId, addr);
      if (banned) {
        useToastStore.getState().addToast("error", "You are banned from this pod");
        hapticError();
        set({ isJoining: false });
        return false;
      }

      // 3. Access check (token gate / balance threshold)
      const access = await checkPodAccess(podId, addr);
      if (!access.granted) {
        const pod = get().getPodById(podId);
        const threshold = pod?.threshold ?? 0n;
        if (threshold > 0n) {
          const balance = useWalletStore.getState().balance;
          if (balance < threshold) {
            useToastStore.getState().addToast(
              "error",
              `Requires ${Number(threshold) / 1e18} QF — you have ${Number(balance) / 1e18} QF` 
            );
            hapticError();
            set({ isJoining: false });
            return false;
          }
        }
        useToastStore.getState().addToast("error", "Access denied — check pod requirements");
        hapticError();
        set({ isJoining: false });
        return false;
      }

      // All checks passed — submit tx
      const result = await contractJoinPod(podId);
      const confirmation = await result.confirmation;

      if (!confirmation.confirmed) {
        const errorMsg = confirmation.error || 'Transaction failed';
        useToastStore.getState().addToast("error", errorMsg);
        hapticError();
        set({ isJoining: false });
        return false;
      }

      // Verify on-chain that we're actually a member now
      try {
        const { isMember: checkMember } = await import('@/lib/contractCalls');
        const verified = await checkMember(podId, evmAddress as `0x${string}`);
        if (!verified) {
          useToastStore.getState().addToast('warning', 'Join transaction confirmed but membership not detected yet. Please refresh.');
        }
      } catch {
        // Non-fatal — membership will be picked up on next fetch
      }

      const pod = get().getPodById(podId);
      useToastStore.getState().addToast("success", `Joined ${pod?.name || 'pod'}`);
      hapticSuccess();
      chimeSuccess();

      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasJoinedPod');
      } catch {}

      await get().fetchUserPods();
      set({ isJoining: false });
      return true;
    } catch (error) {
      console.error('Failed to join pod:', error);
      const errorMsg = getContractErrorMessage(error);
      useToastStore.getState().addToast("error", errorMsg);
      hapticError();
      set({ isJoining: false });
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
    hapticSend();
    
    set((state) => ({ isSending: { ...state.isSending, [podId]: true } }));
    
    try {
      // 2. Contract write — this is the slow part
      const result = await contractSendPodMessage(podId, content);
      const confirmation = await result.confirmation;

      if (!confirmation.confirmed) {
        throw new Error(confirmation.error || 'Transaction not confirmed');
      }
      
      // 3. Success — mark confirmed (remove isOptimistic or refetch)
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).map((m) =>
            m.id === optimisticId ? { ...m, isOptimistic: false } : m
          ),
        },
        isSending: { ...state.isSending, [podId]: false },
      }));
      
      // Mark getting started step
      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasSentMessage');
        hapticConfirm();
      } catch {}
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // 4. Mark as failed instead of removing
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).map((m) =>
            m.id === optimisticId ? { ...m, isOptimistic: false, isFailed: true } : m
          ),
        },
        isSending: { ...state.isSending, [podId]: false },
      }));
      
      useToastStore.getState().addToast("error", getContractErrorMessage(error));
      
      // Haptic feedback for error
      hapticError();
      
      return false;
    }
  },
  
  retryMessage: async (podId: number, messageId: number) => {
    const msg = get().messages[podId]?.find((m) => m.id === messageId);
    if (!msg || !msg.isFailed) return false;

    // Reset to optimistic
    set((state) => ({
      messages: {
        ...state.messages,
        [podId]: (state.messages[podId] || []).map((m) =>
          m.id === messageId ? { ...m, isFailed: false, isOptimistic: true } : m
        ),
      },
    }));

    // Re-attempt send
    const result = await get().sendMessage(podId, msg.content);

    // If sendMessage succeeded, it created a NEW optimistic message.
    // Remove the old failed-then-retried one.
    if (result) {
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).filter((m) => m.id !== messageId),
        },
      }));
    }
    return result;
  },

  dismissFailedMessage: (podId: number, messageId: number) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [podId]: (state.messages[podId] || []).filter((m) => m.id !== messageId),
      },
    }));
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
