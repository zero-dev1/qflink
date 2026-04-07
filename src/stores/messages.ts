import { create } from 'zustand';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { useUnreadStore } from '@/stores/unread';
import {
  getConversations,
  getMessages,
  getDirectMessageIds,
  sendMessage as contractSendMessage,
  getProfile,
} from '@/lib/contractCalls';
import type { DirectMessageData } from '@/lib/contractCalls';

// Module-level cache for DM message counts per conversation (avoids re-fetching unchanged conversations)
const _dmLastFetchedCounts: Record<string, number> = {};

// Module-level cache for conversation list throttling
let _conversationsLastFetchTime = 0;
let _lastConversationAddresses: string[] = [];
const CONVERSATIONS_CACHE_TTL = 30_000; // 30 seconds
import { reverseResolve } from '@/lib/qns';
import { hapticTap, hapticError, hapticSend, hapticConfirm } from '@/lib/feedback';
import {
  encryptMessage,
  decryptMessage,
  base64ToPublicKey,
  publicKeyToBase64,
} from '@/lib/encryption';
import { getContractErrorMessage } from '@/lib/contractErrors';

export interface ConversationItem {
  address: string;
  displayName: string | null;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface DMMessage {
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  id: string;
  isLocalPending?: boolean; // dedup only - not visual
  isEncrypted?: boolean;
  isFailed?: boolean;
}

interface MessagesStore {
  // Data
  conversations: ConversationItem[];
  messages: Record<string, DMMessage[]>; // keyed by other party's address
  
  // Loading states
  isLoadingConversations: boolean;
  isLoadingMessages: Record<string, boolean>;
  isSending: Record<string, boolean>;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (otherAddress: string) => Promise<void>;
  sendMessage: (recipient: string, content: string) => Promise<boolean>;
  retryMessage: (address: string, messageId: string) => Promise<boolean>;
  dismissFailedMessage: (address: string, messageId: string) => void;
  
  // Helpers
  getConversation: (address: string) => ConversationItem | undefined;
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  conversations: [],
  messages: {},
  
  isLoadingConversations: false,
  isLoadingMessages: {},
  isSending: {},
  
  fetchConversations: async () => {
    const evmAddress = useWalletStore.getState().evmAddress;
    if (!evmAddress) return;

    const now = Date.now();
    const isFirstLoad = get().conversations.length === 0;

    // Throttle: skip if we fetched within the cache TTL (unless first load)
    if (!isFirstLoad && now - _conversationsLastFetchTime < CONVERSATIONS_CACHE_TTL) {
      return;
    }

    if (isFirstLoad) {
      set({ isLoadingConversations: true });
    }

    try {
      const addresses = await getConversations(evmAddress as `0x${string}`);

      // Compare address list — if same addresses in same order, skip the expensive per-address fetching
      const addressesMatch =
        addresses.length === _lastConversationAddresses.length &&
        addresses.every((a, i) => a === _lastConversationAddresses[i]);

      if (addressesMatch && !isFirstLoad) {
        _conversationsLastFetchTime = now;
        return;
      }

      _lastConversationAddresses = addresses;
      _conversationsLastFetchTime = now;

      // Build conversation items with last message and QNS names
      const items: ConversationItem[] = await Promise.all(
        addresses.map(async (addr) => {
          const lower = addr.toLowerCase();

          // Fetch last message for preview
          const msgs = await getMessages(
            evmAddress as `0x${string}`,
            lower as `0x${string}`,
            0,
            1
          );
          const lastMsg = msgs[0];

          // Update unread tracking
          if (lastMsg) {
            const lastSeen = useUnreadStore.getState().lastSeenDM[lower] || 0;
            const timestamp = Number(lastMsg.timestamp);
            if (timestamp > lastSeen) {
              useUnreadStore.getState().updateDMUnread(lower, timestamp, 1);
            }
          }

          // Resolve QNS name
          let displayName: string | null = null;
          try {
            displayName = await reverseResolve(lower);
          } catch {}

          return {
            address: lower,
            displayName,
            lastMessage: lastMsg?.content || '',
            lastMessageTime: lastMsg?.timestamp || 0,
            unreadCount: 0,
          };
        })
      );

      // Sort by most recent message first
      items.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      set({ conversations: items, isLoadingConversations: false });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      set({ isLoadingConversations: false });
    }
  },
  
  fetchMessages: async (otherAddress: string) => {
    const evmAddress = useWalletStore.getState().evmAddress;
    if (!evmAddress) return;

    const lower = otherAddress.toLowerCase();
    const existing = get().messages[lower] || [];
    const nonOptimistic = existing.filter(m => !m.isLocalPending && !m.isFailed);
    const isFirstLoad = nonOptimistic.length === 0;
    const lastKnownCount = _dmLastFetchedCounts[lower] || 0;

    // Only show loading spinner on first load
    if (isFirstLoad) {
      set((state) => ({
        isLoadingMessages: { ...state.isLoadingMessages, [lower]: true },
      }));
    }

    try {
      // Probe for new messages: check if any IDs exist beyond what we last fetched
      if (!isFirstLoad && lastKnownCount > 0) {
        const probeIds = await getDirectMessageIds(
          evmAddress as `0x${string}`,
          lower as `0x${string}`,
          lastKnownCount,
          1
        );
        if (probeIds.length === 0) {
          // No new messages — skip the expensive fetch + decrypt cycle
          return;
        }
      }

      // Fetch messages: incremental if we have some, full otherwise
      let raw: DirectMessageData[];
      if (!isFirstLoad && lastKnownCount > 0) {
        raw = await getMessages(
          evmAddress as `0x${string}`,
          lower as `0x${string}`,
          lastKnownCount,
          100
        );
      } else {
        raw = await getMessages(
          evmAddress as `0x${string}`,
          lower as `0x${string}`,
          0,
          100
        );
      }

      // Update tracked count
      if (!isFirstLoad && lastKnownCount > 0) {
        _dmLastFetchedCounts[lower] = lastKnownCount + raw.length;
      } else {
        _dmLastFetchedCounts[lower] = raw.length;
      }

      // If incremental fetch returned nothing new, skip processing
      if (!isFirstLoad && raw.length === 0) {
        if (isFirstLoad) {
          set((state) => ({ isLoadingMessages: { ...state.isLoadingMessages, [lower]: false } }));
        }
        return;
      }

      // Decrypt new messages
      const encryptionKeyPair = useWalletStore.getState().encryptionKeyPair;
      const mapped: DMMessage[] = await Promise.all(
        raw.map(async (m, i) => {
          let content = m.content;

          if (content.startsWith('enc:') && encryptionKeyPair) {
            try {
              const encryptedBase64 = content.slice(4);
              const encryptedBytes = new Uint8Array(
                atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
              );

              const myAddress = useWalletStore.getState().evmAddress?.toLowerCase();
              const otherParty = m.sender.toLowerCase() === myAddress
                ? lower
                : m.sender.toLowerCase();

              const otherProfile = await getProfile(otherParty as `0x${string}`);
              const otherPubkeyHex = otherProfile?.encryptionPubkey;

              if (otherPubkeyHex && !/^0x0+$/.test(otherPubkeyHex)) {
                const pubkeyBytes = new Uint8Array(
                  (otherPubkeyHex.slice(2).match(/.{2}/g) || []).map(b => parseInt(b, 16))
                );
                const otherPubkey = pubkeyBytes.slice(0, 32);
                content = decryptMessage(encryptedBytes, otherPubkey, encryptionKeyPair.secretKey);
              } else {
                content = '[Encrypted message — recipient key unavailable]';
              }
            } catch {
              content = '[Encrypted message — decryption failed]';
            }
          } else if (content.startsWith('enc:') && !encryptionKeyPair) {
            content = '[Encrypted message — connect wallet to decrypt]';
          }

          const globalIndex = (!isFirstLoad && lastKnownCount > 0) ? lastKnownCount + i : i;
          return {
            sender: m.sender.toLowerCase(),
            recipient: m.recipient.toLowerCase(),
            content,
            timestamp: m.timestamp,
            id: `${m.sender}-${m.timestamp}-${globalIndex}`,
            isEncrypted: m.content.startsWith('enc:'),
          };
        })
      );

      // Merge: existing on-chain + new decrypted messages
      const allDecrypted = (!isFirstLoad && lastKnownCount > 0)
        ? [...nonOptimistic, ...mapped]
        : mapped;

      // De-duplicate optimistic/confirming messages that now have a chain counterpart
    const pending = existing.filter(m => m.isLocalPending || m.isFailed);
    const remainingPending = pending.filter((opt) => {
      if (opt.isFailed) return true;
      return !allDecrypted.some(
        (chain) =>
          chain.sender.toLowerCase() === opt.sender.toLowerCase() &&
          chain.content === opt.content &&
          Math.abs(chain.timestamp - opt.timestamp) < 60_000,
      );
    });

    const finalMessages = [...allDecrypted, ...remainingPending]
      .sort((a, b) => a.timestamp - b.timestamp);

      // Compare before set: skip if identical
      if (
        existing.length === finalMessages.length &&
        existing.length > 0 &&
        existing[existing.length - 1].id === finalMessages[finalMessages.length - 1].id
      ) {
        if (isFirstLoad) {
          set((state) => ({ isLoadingMessages: { ...state.isLoadingMessages, [lower]: false } }));
        }
        return;
      }

      set((state) => ({
        messages: { ...state.messages, [lower]: finalMessages },
        isLoadingMessages: { ...state.isLoadingMessages, [lower]: false },
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set((state) => ({
        isLoadingMessages: { ...state.isLoadingMessages, [lower]: false },
      }));
    }
  },
  
  sendMessage: async (recipient: string, content: string) => {
  const evmAddress = useWalletStore.getState().evmAddress;
  if (!evmAddress) return false;

  const lower = recipient.toLowerCase();
  const addr = lower;
  set((state) => ({ isSending: { ...state.isSending, [addr]: true } }));

  // Optimistic insert
  const optimistic: DMMessage = {
    sender: evmAddress.toLowerCase(),
    recipient: lower,
    content,
    timestamp: Date.now(),
    id: `optimistic-${Date.now()}`,
    isLocalPending: true,
  };

  set((state) => ({
    messages: {
      ...state.messages,
      [lower]: [...(state.messages[lower] || []), optimistic],
    },
  }));

  hapticSend();

  try {
    // --- Encryption logic (unchanged) ---
    let activeKeyPair = useWalletStore.getState().encryptionKeyPair;
    if (!activeKeyPair) {
      // Try sessionStorage first (covers page refresh without re-prompting)
      const { loadKeypairFromSession } = await import('@/lib/encryption');
      activeKeyPair = loadKeypairFromSession();
      if (activeKeyPair) {
        useWalletStore.setState({ encryptionKeyPair: activeKeyPair });
      } else {
        // Last resort: try to re-derive (will prompt wallet popup)
        try {
          const { getCurrentConnection } = await import('@/lib/wallet');
          const conn = getCurrentConnection();
          if (conn?.signer?.polkadotSigner?.signBytes) {
            const { deriveEncryptionKeypair, saveKeypairToSession } = await import('@/lib/encryption');
            const signMessage = async (message: string): Promise<Uint8Array> => {
              const encoder = new TextEncoder();
              const messageBytes = encoder.encode(message);
              const result = await conn.signer.polkadotSigner.signBytes(messageBytes);
              return new Uint8Array(result);
            };
            activeKeyPair = await deriveEncryptionKeypair(signMessage);
            saveKeypairToSession(activeKeyPair);
            useWalletStore.setState({ encryptionKeyPair: activeKeyPair });
          }
        } catch {}
      }
    }

    let messageToSend = content;
    let isEncrypted = false;

    if (activeKeyPair) {
      try {
        const recipientProfile = await getProfile(lower as `0x${string}`);
        const recipientPubkeyHex = recipientProfile?.encryptionPubkey;
        const hasRealPubkey = recipientPubkeyHex &&
          recipientPubkeyHex !== '0x' &&
          recipientPubkeyHex !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
          !/^0x0+$/.test(recipientPubkeyHex);

        if (hasRealPubkey) {
          const pubkeyBytes = new Uint8Array(
            (recipientPubkeyHex.slice(2).match(/.{2}/g) || []).map(b => parseInt(b, 16))
          );
          const recipientPubkey = pubkeyBytes.slice(0, 32);
          const encrypted = encryptMessage(content, recipientPubkey, activeKeyPair.secretKey);
          messageToSend = 'enc:' + btoa(String.fromCharCode(...encrypted));
          isEncrypted = true;
        }
      } catch (encErr) {
        console.warn('[messages] Encryption failed, sending plaintext:', encErr);
      }
    }
    // --- End encryption logic ---

    // Contract write - returns on BROADCAST
    const result = await contractSendMessage(lower as `0x${string}`, messageToSend);

    // BROADCAST RECEIVED - unlock input immediately
    set((state) => ({
      messages: {
        ...state.messages,
        [lower]: (state.messages[lower] || []).map((m) =>
          m.id === optimistic.id ? { ...m, isLocalPending: true } : m
        ),
      },
      isSending: { ...state.isSending, [addr]: false },
    }));

    // Update conversation list preview immediately
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.address === lower
          ? { ...c, lastMessage: content, lastMessageTime: Date.now() }
          : c
      ),
    }));

    // BACKGROUND CONFIRMATION
    result.confirmation.then(async (confirmation) => {
      if (confirmation.confirmed) {
        set((state) => ({
          messages: {
            ...state.messages,
            [lower]: (state.messages[lower] || []).map((m) =>
              m.id === optimistic.id
                ? { ...m, isLocalPending: false }
                : m
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
          const beforeCount = (get().messages[lower] || [])
            .filter(m => !m.isLocalPending && !m.isFailed).length;
          const { getDirectMessageIds } = await import('@/lib/contractCalls');
          const onChainIds = await getDirectMessageIds(
            evmAddress as `0x${string}`,
            lower as `0x${string}`,
            beforeCount,
            1
          );
          if (onChainIds.length > 0) {
            // Message landed - mark clean
            set((state) => ({
              messages: {
                ...state.messages,
                [lower]: (state.messages[lower] || []).map((m) =>
                  m.id === optimistic.id ? { ...m, isLocalPending: false } : m
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
            [lower]: (state.messages[lower] || []).map((m) =>
              m.id === optimistic.id ? { ...m, isLocalPending: false, isFailed: true } : m
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
            [lower]: (state.messages[lower] || []).map((m) =>
              m.id === optimistic.id ? { ...m, isLocalPending: false } : m
            ),
          },
        }));
      }
    }).catch(() => {
      // Promise error - treat as landed
      set((state) => ({
        messages: {
          ...state.messages,
          [lower]: (state.messages[lower] || []).map((m) =>
            m.id === optimistic.id ? { ...m, isLocalPending: false } : m
          ),
        },
      }));
    });

    // Mark getting started step
    try {
      const { useGettingStartedStore } = await import('@/stores/gettingStarted');
      useGettingStartedStore.getState().markStep('hasSentMessage');
    } catch {}

    return true;
  } catch (error) {
    // Pre-broadcast failure (user rejected, wallet disconnected, gas error)
    console.error('Failed to send message:', error);

    set((state) => ({
      messages: {
        ...state.messages,
        [lower]: (state.messages[lower] || []).map((m) =>
          m.id === optimistic.id ? { ...m, isLocalPending: false, isFailed: true } : m
        ),
      },
      isSending: { ...state.isSending, [addr]: false },
    }));

    const errorMsg = getContractErrorMessage(error);
    if (!errorMsg.includes('cancelled')) {
      useToastStore.getState().addToast('error', errorMsg);
    }
    hapticError();
    return false;
  }
},
  
  retryMessage: async (address: string, messageId: string) => {
    const msg = get().messages[address]?.find((m) => m.id === messageId);
    if (!msg || !msg.isFailed) return false;

    // Reset to optimistic
    set((state) => ({
      messages: {
        ...state.messages,
        [address]: (state.messages[address] || []).map((m) =>
          m.id === messageId ? { ...m, isFailed: false, isOptimistic: true } : m
        ),
      },
    }));

    // Re-attempt send
    const result = await get().sendMessage(address, msg.content);

    // If sendMessage succeeded, it created a NEW optimistic message.
    // Remove the old failed-then-retried one.
    if (result) {
      set((state) => ({
        messages: {
          ...state.messages,
          [address]: (state.messages[address] || []).filter((m) => m.id !== messageId),
        },
      }));
    }
    return result;
  },

  dismissFailedMessage: (address: string, messageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [address]: (state.messages[address] || []).filter((m) => m.id !== messageId),
      },
    }));
  },
  
  getConversation: (address: string) => {
    return get().conversations.find((c) => c.address === address.toLowerCase());
  },
}));
