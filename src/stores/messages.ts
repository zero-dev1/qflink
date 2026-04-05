import { create } from 'zustand';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import {
  getConversations,
  getMessages,
  sendMessage as contractSendMessage,
} from '@/lib/contractCalls';
import type { DirectMessageData } from '@/lib/contractCalls';
import { reverseResolve } from '@/lib/qns';

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
      
      const mapped: DMMessage[] = raw.map((m, i) => ({
        sender: m.sender.toLowerCase(),
        recipient: m.recipient.toLowerCase(),
        content: m.content,
        timestamp: m.timestamp,
        id: `${m.sender}-${m.timestamp}-${i}`,
      }));
      
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
    
    try {
      const result = await contractSendMessage(lower as `0x${string}`, content);
      await result.confirmation;
      
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
      
      useToastStore.getState().addToast('error', 'Failed to send message');
      return false;
    }
  },
  
  getConversation: (address: string) => {
    return get().conversations.find((c) => c.address === address.toLowerCase());
  },
}));
