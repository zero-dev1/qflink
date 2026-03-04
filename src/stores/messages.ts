import { create } from 'zustand'
import { hexToBytes } from 'viem'
import type { MessagesState, Message, Conversation } from '@/types'
import * as cc from '@/lib/contractCalls'
import { useWalletStore } from './wallet'

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversation: null,
  isLoading: false,

  setActiveConversation: (address: string | null) => set({ activeConversation: address }),

  addMessage: (message: Message) => {
    const state = get()
    const { evmAddress } = useWalletStore.getState()
    const normalizedSender = message.sender.toLowerCase()
    const normalizedRecipient = message.recipient.toLowerCase()
    const isMine = evmAddress && normalizedSender === evmAddress.toLowerCase()
    const otherAddress = isMine ? normalizedRecipient : normalizedSender
    const key = otherAddress
    const existing = state.messages[key] || []

    set({
      messages: {
        ...state.messages,
        [key]: [...existing, { ...message, sender: normalizedSender, recipient: normalizedRecipient }],
      },
    })

    const convos = [...state.conversations]
    const idx = convos.findIndex((c) => c.address.toLowerCase() === otherAddress)
    const updatedConvo: Conversation = {
      address: otherAddress,
      lastMessage: message.decryptedContent || 'Encrypted message',
      lastMessageTime: message.timestamp,
      unreadCount: idx >= 0 ? convos[idx].unreadCount : 0,
    }

    if (idx >= 0) {
      convos[idx] = updatedConvo
    } else {
      convos.unshift(updatedConvo)
    }

    convos.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
    set({ conversations: convos })
  },

  setMessages: (address: string, messages: Message[]) => {
    set({ messages: { ...get().messages, [address]: messages } })
  },

  setConversations: (conversations: Conversation[]) => set({ conversations }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  fetchConversations: async () => {
    const { evmAddress } = useWalletStore.getState()
    if (!evmAddress) {
      return
    }

    set({ isLoading: true })
    try {
      const addresses = await cc.getConversations(evmAddress as `0x${string}`)
      
      // Fetch last message for each conversation
      const conversations: Conversation[] = await Promise.all(
        addresses.map(async (addr) => {
          const normalizedAddr = addr.toLowerCase()
          try {
            const rawMsgs = await cc.getMessages(
              evmAddress as `0x${string}`,
              normalizedAddr as `0x${string}`
            )
            if (rawMsgs.length > 0) {
              const lastRaw = rawMsgs[rawMsgs.length - 1]
              const bytes = hexToBytes(lastRaw.contentHash)
              const content = new TextDecoder().decode(bytes).replace(/\0/g, '').trim()
              return {
                address: normalizedAddr,
                lastMessage: content || 'Message',
                lastMessageTime: lastRaw.timestamp,
                unreadCount: 0,
              }
            }
          } catch {}
          return {
            address: normalizedAddr,
            unreadCount: 0,
          }
        })
      )
      
      conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
      
      set({ conversations })
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMessages: async (otherAddress: string) => {
    const { evmAddress } = useWalletStore.getState()
    if (!evmAddress) {
      return
    }

    try {
      const rawMsgs = await cc.getMessages(
        evmAddress as `0x${string}`,
        otherAddress as `0x${string}`
      )
      
      const messages: Message[] = rawMsgs.map((m) => {
        const bytes = hexToBytes(m.contentHash)
        const decrypted = new TextDecoder().decode(bytes).replace(/\0/g, '').trim()
        return {
          id: `${m.sender}-${m.timestamp}`,
          sender: m.sender,
          recipient: m.recipient,
          encryptedContent: bytes,
          decryptedContent: decrypted,
          timestamp: m.timestamp,
        }
      })
      
      const state = get()
      const sorted = messages.sort((a, b) => a.timestamp - b.timestamp)
      set({ messages: { ...state.messages, [otherAddress]: sorted } })
      
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1]
        const convos = [...state.conversations]
        const idx = convos.findIndex((c) => c.address.toLowerCase() === otherAddress.toLowerCase())
        
        if (idx >= 0) {
          convos[idx] = {
            ...convos[idx],
            lastMessage: lastMsg.decryptedContent || 'Message',
            lastMessageTime: lastMsg.timestamp,
          }
          convos.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
          set({ conversations: convos })
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  },

  sendMessage: async (recipient: string, content: string) => {
    const { evmAddress } = useWalletStore.getState()
    if (!evmAddress) {
      throw new Error('Wallet not connected')
    }

    const contentBytes = new TextEncoder().encode(content)
    const result = await cc.sendDirectMessageChunked(
      recipient.toLowerCase() as `0x${string}`,
      contentBytes
    )

    const message: Message = {
      id: result.id,
      sender: result.sender,
      recipient: result.recipient,
      encryptedContent: result.encryptedContent,
      decryptedContent: result.decryptedContent,
      timestamp: result.timestamp,
    }

    get().addMessage(message)
  },
}))
