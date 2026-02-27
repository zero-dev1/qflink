import { useCallback, useRef } from 'react'
import { useMessagesStore } from '@/stores/messages'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import { sendMessageOnChain, getMessages, getConversations } from '@/lib/contracts'
import { encryptMessage } from '@/lib/encryption'
import type { Conversation } from '@/types'

export function useMessages() {
  // Use selectors to avoid subscribing to entire stores
  const conversations = useMessagesStore((s) => s.conversations)
  const messages = useMessagesStore((s) => s.messages)
  const activeConversation = useMessagesStore((s) => s.activeConversation)
  const isLoading = useMessagesStore((s) => s.isLoading)
  const setActiveConversation = useMessagesStore((s) => s.setActiveConversation)
  const setLoading = useMessagesStore((s) => s.setLoading)
  const setConversations = useMessagesStore((s) => s.setConversations)
  const setMessages = useMessagesStore((s) => s.setMessages)
  const addMessage = useMessagesStore((s) => s.addMessage)

  const walletAddress = useWalletStore((s) => s.address)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const encryptionKeyPair = useWalletStore((s) => s.encryptionKeyPair)
  const addToast = useUIStore((s) => s.addToast)

  // Use refs for values needed in callbacks to avoid dependency churn
  const walletAddressRef = useRef(walletAddress)
  walletAddressRef.current = walletAddress
  const evmAddressRef = useRef(evmAddress)
  evmAddressRef.current = evmAddress
  const encryptionKeyPairRef = useRef(encryptionKeyPair)
  encryptionKeyPairRef.current = encryptionKeyPair

  const loadConversations = useCallback(async () => {
    const addr = evmAddressRef.current
    console.log('[useMessages.loadConversations] Starting - EVM address:', addr)
    if (!addr) {
      console.log('[useMessages.loadConversations] No EVM address, returning')
      return
    }
    setLoading(true)
    try {
      const addresses = await getConversations(addr)
      console.log('[useMessages.loadConversations] Got addresses:', addresses)
      
      // Fetch latest message for each conversation
      const convos: Conversation[] = await Promise.all(
        addresses.map(async (a) => {
          const otherAddress = a.toLowerCase()
          let lastMessage = 'Encrypted message'
          let lastMessageTime = Date.now()
          
          try {
            const messages = await getMessages(addr, otherAddress)
            if (messages.length > 0) {
              const latest = messages[messages.length - 1]
              lastMessage = latest.decryptedContent || 'Encrypted message'
              lastMessageTime = latest.timestamp || Date.now()
            }
          } catch (err) {
            console.warn(`Failed to fetch messages for ${otherAddress}:`, err)
          }
          
          return {
            address: otherAddress,
            lastMessage,
            lastMessageTime,
            unreadCount: 0,
          }
        })
      )
      console.log('[useMessages.loadConversations] Setting conversations:', convos)
      setConversations(convos)
    } catch (err) {
      console.error('[useMessages.loadConversations] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setConversations])

  const loadMessages = useCallback(
    async (otherAddress: string) => {
      const addr = evmAddressRef.current
      if (!addr) return
      setLoading(true)
      try {
        const msgs = await getMessages(addr, otherAddress)
        // decryptedContent is populated by contracts.ts mock decryption
        setMessages(otherAddress, msgs)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setMessages]
  )

  const sendMessage = useCallback(
    async (recipient: string, content: string) => {
      const addr = walletAddressRef.current
      if (!addr) {
        addToast('error', 'Please connect your wallet first')
        return
      }

      try {
        // Pass plaintext as bytes — contracts.ts handles encryption with mock key pairs
        const plaintextBytes = new TextEncoder().encode(content)
        const message = await sendMessageOnChain(addr, recipient, plaintextBytes)
        // Attach decrypted content for immediate display without re-fetching
        message.decryptedContent = content
        addMessage(message)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message'
        addToast('error', msg)
      }
    },
    [addToast, addMessage]
  )

  return {
    conversations,
    messages,
    activeConversation,
    isLoading,
    setActiveConversation,
    loadConversations,
    loadMessages,
    sendMessage,
  }
}
