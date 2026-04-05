import { create } from 'zustand';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { useUnreadStore } from '@/stores/unread';
import {
  getConversations,
  getMessages,
  sendMessage as contractSendMessage,
  getProfile,
} from '@/lib/contractCalls';
import type { DirectMessageData } from '@/lib/contractCalls';
import { reverseResolve } from '@/lib/qns';
import { hapticTap, hapticError } from '@/lib/feedback';
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
  isOptimistic?: boolean;
  isEncrypted?: boolean;
}

interface MessagesStore {
  // Data
  conversations: ConversationItem[];
  messages: Record<string, DMMessage[]>; // keyed by other party's address
  
  // Loading states
  isLoadingConversations: boolean;
  isLoadingMessages: Record<string, boolean>;
  isSending: boolean;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (otherAddress: string) => Promise<void>;
  sendMessage: (recipient: string, content: string) => Promise<boolean>;
  
  // Helpers
  getConversation: (address: string) => ConversationItem | undefined;
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  conversations: [],
  messages: {},
  
  isLoadingConversations: false,
  isLoadingMessages: {},
  isSending: false,
  
  fetchConversations: async () => {
    const evmAddress = useWalletStore.getState().evmAddress;
    if (!evmAddress) return;
    
    set({ isLoadingConversations: true });
    
    try {
      const addresses = await getConversations(evmAddress as `0x${string}`);
      
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
            unreadCount: 0, // Unread tracking comes in Session 7
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
    
    set((state) => ({
      isLoadingMessages: { ...state.isLoadingMessages, [lower]: true },
    }));
    
    try {
      const raw = await getMessages(
        evmAddress as `0x${string}`,
        lower as `0x${string}`,
        0,
        100
      );
      
      const encryptionKeyPair = useWalletStore.getState().encryptionKeyPair;

      const mapped: DMMessage[] = await Promise.all(
        raw.map(async (m, i) => {
          let content = m.content;
          let decryptionFailed = false;

          // Detect encrypted messages by prefix
          if (content.startsWith('enc:') && encryptionKeyPair) {
            try {
              const encryptedBase64 = content.slice(4); // strip 'enc:' prefix
              const encryptedBytes = new Uint8Array(
                atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
              );

              // We need the sender's pubkey to decrypt
              // If we're the sender, use recipient's pubkey; if we're the recipient, use sender's pubkey
              const myAddress = useWalletStore.getState().evmAddress?.toLowerCase();
              const otherParty = m.sender.toLowerCase() === myAddress
                ? lower // the other address we're chatting with
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
                decryptionFailed = true;
                content = '[Encrypted message — recipient key unavailable]';
              }
            } catch {
              decryptionFailed = true;
              content = '[Encrypted message — decryption failed]';
            }
          } else if (content.startsWith('enc:') && !encryptionKeyPair) {
            content = '[Encrypted message — connect wallet to decrypt]';
          }

          return {
            sender: m.sender.toLowerCase(),
            recipient: m.recipient.toLowerCase(),
            content,
            timestamp: m.timestamp,
            id: `${m.sender}-${m.timestamp}-${i}`,
            isEncrypted: content.startsWith('enc:') || false,
          };
        })
      );
      
      set((state) => ({
        messages: { ...state.messages, [lower]: mapped },
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
    set({ isSending: true });
    
    // Optimistic insert
    const optimistic: DMMessage = {
      sender: evmAddress.toLowerCase(),
      recipient: lower,
      content,
      timestamp: Date.now(),
      id: `optimistic-${Date.now()}`,
      isOptimistic: true,
    };
    
    set((state) => ({
      messages: {
        ...state.messages,
        [lower]: [...(state.messages[lower] || []), optimistic],
      },
    }));
    
    // Haptic feedback for message send
    hapticTap();
    
    try {
      // Attempt encryption if we have a keypair
      const encryptionKeyPair = useWalletStore.getState().encryptionKeyPair;
      let messageToSend = content;
      let isEncrypted = false;

      if (encryptionKeyPair) {
        try {
          // Fetch recipient's encryption pubkey from their on-chain profile
          const recipientProfile = await getProfile(lower as `0x${string}`);
          const recipientPubkeyHex = recipientProfile?.encryptionPubkey;

          // Check if recipient has a real encryption pubkey (not zero)
          const hasRealPubkey = recipientPubkeyHex &&
            recipientPubkeyHex !== '0x' &&
            recipientPubkeyHex !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
            !/^0x0+$/.test(recipientPubkeyHex);

          if (hasRealPubkey) {
            // Decode recipient pubkey — stored as hex on-chain, need Uint8Array
            const pubkeyBytes = new Uint8Array(
              (recipientPubkeyHex.slice(2).match(/.{2}/g) || []).map(b => parseInt(b, 16))
            );
            // NaCl box pubkey is 32 bytes
            const recipientPubkey = pubkeyBytes.slice(0, 32);

            const encrypted = encryptMessage(content, recipientPubkey, encryptionKeyPair.secretKey);
            // Encode as base64 with prefix so we can detect encrypted messages on read
            messageToSend = 'enc:' + btoa(String.fromCharCode(...encrypted));
            isEncrypted = true;
          }
        } catch (encErr) {
          console.warn('[messages] Encryption failed, sending plaintext:', encErr);
          // Fall through to send plaintext
        }
      }

      const result = await contractSendMessage(lower as `0x${string}`, messageToSend);
      const confirmation = await result.confirmation;

      if (!confirmation.confirmed) {
        throw new Error(confirmation.error || 'Transaction not confirmed');
      }
      
      // Mark getting started step
      try {
        const { useGettingStartedStore } = await import('@/stores/gettingStarted');
        useGettingStartedStore.getState().markStep('hasSentMessage');
      } catch {}
      
      // Mark as confirmed by removing optimistic flag
      set((state) => ({
        messages: {
          ...state.messages,
          [lower]: (state.messages[lower] || []).map((m) =>
            m.id === optimistic.id ? { ...m, isOptimistic: false } : m
          ),
        },
        isSending: false,
      }));
      
      // Update conversation list preview
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.address === lower
            ? { ...c, lastMessage: content, lastMessageTime: Date.now() }
            : c
        ),
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Rollback optimistic
      set((state) => ({
        messages: {
          ...state.messages,
          [lower]: (state.messages[lower] || []).filter(
            (m) => m.id !== optimistic.id
          ),
        },
        isSending: false,
      }));
      
      useToastStore.getState().addToast('error', getContractErrorMessage(error));
      
      // Haptic feedback for error
      hapticError();
      
      return false;
    }
  },
  
  getConversation: (address: string) => {
    return get().conversations.find((c) => c.address === address.toLowerCase());
  },
}));
