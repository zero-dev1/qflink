import { create } from 'zustand'
import type { MessagesState, Message, Conversation } from '@/types'
import { getApi, type InjectedAccountWithMeta } from '@/lib/chain'
import { getConversations, getMessages, messagesSendMessage } from '@/lib/contracts'
import { useWalletStore } from './wallet'
import { keccak256AsU8a } from '@polkadot/util-crypto'
import nacl from 'tweetnacl'

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
      console.warn('No EVM address available')
      return
    }

    set({ isLoading: true })
    try {
      const addresses = await getConversations(evmAddress)
      
      // Fetch last message for each conversation
      const conversations: Conversation[] = await Promise.all(
        addresses.map(async (addr) => {
          const normalizedAddr = addr.toLowerCase()
          try {
            // Get the most recent message
            const messages = await getMessages(evmAddress, normalizedAddr)
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1] // Most recent is last
              return {
                address: normalizedAddr,
                lastMessage: lastMsg.decryptedContent || 'Encrypted message',
                lastMessageTime: lastMsg.timestamp,
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
      
      // Sort by most recent message
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
      console.warn('No EVM address available')
      return
    }

    try {
      const messages = await getMessages(evmAddress, otherAddress)
      
      // Always update state - let React handle re-rendering
      // This ensures chunked messages appear correctly when reassembly completes
      const state = get()
      const sorted = messages.sort((a, b) => a.timestamp - b.timestamp)
      set({ messages: { ...state.messages, [otherAddress]: sorted } })
      
      // Update conversation lastMessage with most recent message content (if available)
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1] // Most recent is last
        const convos = [...state.conversations]
        const idx = convos.findIndex((c) => c.address.toLowerCase() === otherAddress.toLowerCase())
        
        if (idx >= 0) {
          convos[idx] = {
            ...convos[idx],
            lastMessage: lastMsg.decryptedContent || 'Encrypted message',
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
    const { address, walletSource, evmAddress, encryptionKeyPair } = useWalletStore.getState()
    if (!address || !walletSource || !evmAddress || !encryptionKeyPair) {
      throw new Error('Wallet not connected, not mapped, or encryption key not set')
    }

    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    const account: InjectedAccountWithMeta = {
      address,
      meta: { source: walletSource },
      signer: injector.signer,
    }

    // Encode content as UTF-8 bytes (same as pod messages)
    const messageBytes = new TextEncoder().encode(content)
    const contentHash = new Uint8Array(32)
    contentHash.set(messageBytes.slice(0, 32))
    
    const nonce = new Uint8Array(24) // Dummy nonce

    const api = await getApi()
    await messagesSendMessage(api, account, recipient.toLowerCase(), contentHash, nonce)

    const message: Message = {
      id: `${evmAddress}-${Date.now()}`,
      sender: evmAddress.toLowerCase(),
      recipient: recipient.toLowerCase(),
      encryptedContent: contentHash,
      decryptedContent: content,
      timestamp: Date.now(),
    }

    get().addMessage(message)
  },
}))
