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
  invalidateUserPodsCache,
  invalidateAllPodsCache,
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
  isLocalPending?: boolean; // internal flag for dedup — NOT for visual state
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
  addOptimisticPod: (pod: PodData) => void;
  
  // Helpers
  getPodById: (id: number) => PodData | undefined;
  isUserMember: (podId: number) => boolean;
}

// Module-level tracking for optimistic pod memberships (survives fetchUserPods reconciliation)
const _optimisticMemberPodIds = new Set<number>();

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
  const current = get().pods;
  const isFirstLoad = current.length === 0;
  if (isFirstLoad) set({ isLoadingPods: true, podFetchError: false });

  try {
    const chainPods = await getAllPods();

    // QNS pattern: preserve optimistic pods not yet confirmed on chain
    const optimisticPods = current.filter(p => {
      const isOptimistic = Number(p.id) > 1_000_000_000_000;
      return isOptimistic && !chainPods.some(cp => cp.name.toLowerCase() === p.name.toLowerCase());
    });
    const pods = [...chainPods, ...optimisticPods];

    // Compare before set: skip if identical (prevents re-renders)
    if (
      pods.length === current.length &&
      pods.every((p, i) =>
        Number(p.id) === Number(current[i].id) &&
        p.memberCount === current[i].memberCount &&
        p.name === current[i].name
      )
    ) {
      if (isFirstLoad) set({ isLoadingPods: false });
      return;
    }

    set({ pods, isLoadingPods: false, podFetchError: false });
  } catch (error) {
    console.error('Failed to fetch pods:', error);
    if (isFirstLoad) set({ isLoadingPods: false, podFetchError: true });
  }
},
  
  fetchUserPods: async () => {
    try {
      const evmAddress = useWalletStore.getState().evmAddress;
      if (!evmAddress) return;
      
      const chainPodIds = await getUserPods(evmAddress as `0x${string}`);

      // Clear confirmed optimistic memberships
      for (const id of _optimisticMemberPodIds) {
        if (chainPodIds.includes(id)) _optimisticMemberPodIds.delete(id);
      }

      // Merge remaining optimistic memberships (QNS pattern)
      const merged = [
        ...chainPodIds,
        ...[..._optimisticMemberPodIds].filter(id => !chainPodIds.includes(id)),
      ];

      // Compare before set: skip if identical (prevents re-renders)
      const current = get().userPodIds;
      if (
        merged.length === current.length &&
        merged.every((id, i) => id === current[i])
      ) {
        return;
      }

      set({ userPodIds: merged });
    } catch (error) {
      console.error('Failed to fetch user pods:', error);
    }
  },
  
  fetchMessages: async (podId: number) => {
    const existing = get().messages[podId] || [];
    const nonOptimistic = existing.filter(m => !m.isLocalPending && !m.isFailed);
    const isFirstLoad = nonOptimistic.length === 0;

    // Only show loading spinner on first load, not on polls
    if (isFirstLoad) {
      set(state => ({
        isLoadingMessages: { ...state.isLoadingMessages, [podId]: true },
        messageFetchErrors: { ...state.messageFetchErrors, [podId]: false }
      }));
    }

    try {
      // Count-based early return: skip fetch if on-chain count matches what we have
      const onChainCount = await getPodMessageCount(podId);
      if (!isFirstLoad && onChainCount === nonOptimistic.length) {
        // Same count — no new messages, skip the expensive fetch + state update
        if (isFirstLoad) {
          set(state => ({ isLoadingMessages: { ...state.isLoadingMessages, [podId]: false } }));
        }
        return;
      }

      // Incremental fetch: only get new messages if we already have some
      let newOnChain: RawPodMessage[];
      if (!isFirstLoad && onChainCount > nonOptimistic.length) {
        // Fetch only the new messages from where we left off
        newOnChain = await getPodMessages(podId, nonOptimistic.length, onChainCount - nonOptimistic.length);
      } else {
        // First load or count mismatch — full fetch
        newOnChain = await getPodMessages(podId);
      }

      // Merge: existing on-chain + new on-chain
      const allOnChain = !isFirstLoad && onChainCount > nonOptimistic.length
        ? [...nonOptimistic, ...newOnChain]
        : newOnChain;

      // De-duplicate: remove optimistic/confirming messages that now have a chain counterpart
    const pending = existing.filter(m => m.isLocalPending || m.isFailed);
    const remainingPending = pending.filter((opt) => {
      if (opt.isFailed) return true;
      return !allOnChain.some(
        (chain: RawPodMessage) =>
          chain.sender.toLowerCase() === opt.sender.toLowerCase() &&
          chain.content === opt.content &&
          Math.abs(chain.timestamp - opt.timestamp) < 60_000,
      );
    });

    const finalMessages = [...allOnChain, ...remainingPending]
      .sort((a, b) => a.timestamp - b.timestamp);

      // Compare before set: if same length and last message ID matches, skip update
      if (
        existing.length === finalMessages.length &&
        existing.length > 0 &&
        existing[existing.length - 1].id === finalMessages[finalMessages.length - 1].id
      ) {
        if (isFirstLoad) {
          set(state => ({ isLoadingMessages: { ...state.isLoadingMessages, [podId]: false } }));
        }
        return;
      }

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

    // Broadcast received — show success immediately (QNS pattern)
    const pod = get().getPodById(podId);
    useToastStore.getState().addToast('success', `Joined ${pod?.name || 'pod'}`);
    hapticSuccess();
    chimeSuccess();
    // Optimistic membership — user can send immediately (QNS pattern)
    _optimisticMemberPodIds.add(podId);
    invalidateUserPodsCache();
    set(state => ({
      isJoining: false,
      userPodIds: state.userPodIds.includes(podId)
        ? state.userPodIds
        : [...state.userPodIds, podId],
    }));

    // Mark getting started step
    try {
      const { useGettingStartedStore } = await import('@/stores/gettingStarted');
      useGettingStartedStore.getState().markStep('hasJoinedPod');
    } catch {}

    // Refresh pod list immediately — membership may show on next poll
    get().fetchUserPods();

    // Background confirmation — verify and warn only on actual failure
    result.confirmation.then(async (confirmation) => {
      if (confirmation.confirmed) {
        // Perfect — nothing to do, user already saw success
        return;
      }

      // Verify on-chain: is the user actually a member now?
      try {
        const verified = await isMember(podId, evmAddress as `0x${string}`);
        if (verified) return; // On-chain confirms membership, all good
      } catch {}

      // Only warn on actual revert, not subscription timeout
      const isActualFailure = confirmation.error &&
        confirmation.error !== 'not_confirmed' &&
        confirmation.error !== 'verification_failed';

      if (isActualFailure) {
        useToastStore.getState().addToast('warning', 'Join may not have completed — please check your membership');
      }
      // For "not_confirmed" — silent, the poll will reconcile
    }).catch(() => {
      // Silent — confirmation promise error is non-fatal
    });

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

    const optimisticId = Date.now();
    const optimisticMessage: RawPodMessage = {
      id: optimisticId,
      sender: evmAddress,
      content,
      timestamp: Date.now(), // milliseconds — matches _fetchMessage on-chain format
      isLocalPending: true, // for dedup only - message renders at full opacity
    };

    // Instant insert - full opacity, no visual indicator
    set(state => ({
      messages: {
        ...state.messages,
        [podId]: [...(state.messages[podId] || []), optimisticMessage]
      }
    }));

    hapticSend();
    set((state) => ({ isSending: { ...state.isSending, [podId]: true } }));

    try {
      const result = await contractSendPodMessage(podId, content);

      // Broadcast received - unlock input immediately
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).map((m) =>
            m.id === optimisticId ? { ...m, isLocalPending: true } : m
          ),
        },
        isSending: { ...state.isSending, [podId]: false },
      }));

      // Background confirmation - only care about actual failures
      result.confirmation.then(async (confirmation) => {
        if (confirmation.confirmed) {
          // Remove local pending flag - next poll will replace with chain copy
          set((state) => ({
            messages: {
              ...state.messages,
              [podId]: (state.messages[podId] || []).map((m) =>
                m.id === optimisticId ? { ...m, isLocalPending: false } : m
              ),
            },
          }));
          hapticConfirm();
          return;
        }

        // Check if it's a real failure or just subscription timeout
        const isActualFailure = confirmation.error &&
          confirmation.error !== 'not_confirmed' &&
          confirmation.error !== 'verification_failed';

        if (isActualFailure) {
          // Verify on-chain before marking failed
          try {
            const beforeCount = (get().messages[podId] || [])
              .filter(m => !m.isLocalPending && !m.isFailed).length;
            const onChainCount = await getPodMessageCount(podId);
            if (onChainCount > beforeCount) {
              // Message landed - mark clean
              set((state) => ({
                messages: {
                  ...state.messages,
                  [podId]: (state.messages[podId] || []).map((m) =>
                    m.id === optimisticId ? { ...m, isLocalPending: false } : m
                  ),
                },
              }));
              hapticConfirm();
              return;
            }
          } catch {}

          set((state) => ({
            messages: {
              ...state.messages,
              [podId]: (state.messages[podId] || []).map((m) =>
                m.id === optimisticId ? { ...m, isLocalPending: false, isFailed: true } : m
              ),
            },
          }));
          useToastStore.getState().addToast('error', confirmation.error || 'Transaction failed');
          hapticError();
        } else {
          // Subscription timeout - tx almost certainly landed, mark clean
          set((state) => ({
            messages: {
              ...state.messages,
              [podId]: (state.messages[podId] || []).map((m) =>
                m.id === optimisticId ? { ...m, isLocalPending: false } : m
              ),
            },
          }));
        }
      }).catch(() => {
        // Promise error - treat as landed
        set((state) => ({
          messages: {
            ...state.messages,
            [podId]: (state.messages[podId] || []).map((m) =>
              m.id === optimisticId ? { ...m, isLocalPending: false } : m
            ),
          },
        }));
      });

      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasSentMessage');
      } catch {}

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      set((state) => ({
        messages: {
          ...state.messages,
          [podId]: (state.messages[podId] || []).map((m) =>
            m.id === optimisticId ? { ...m, isLocalPending: false, isFailed: true } : m
          ),
        },
        isSending: { ...state.isSending, [podId]: false },
      }));

      const errorMsg = getContractErrorMessage(error);
      if (!errorMsg.includes('cancelled')) {
        useToastStore.getState().addToast('error', errorMsg);
      }
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
          m.id === messageId ? { ...m, isFailed: false, isLocalPending: true } : m
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

  addOptimisticPod: (pod: PodData) => {
    set((state) => {
      // Don't add if a pod with this name already exists
      if (state.pods.some(p => p.name === pod.name)) return state;
      return {
        pods: [...state.pods, pod],
        userPodIds: [...state.userPodIds, Number(pod.id)],
      };
    });
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
