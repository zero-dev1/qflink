import { useCallback, useRef } from 'react'
import { hexToBytes } from 'viem'
import { useMessagesStore } from '@/stores/messages'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import * as cc from '@/lib/contractCalls'
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
    if (!addr) return
    setLoading(true)
    try {
      const addresses = await cc.getConversations(addr as `0x${string}`)
      
      const convos: Conversation[] = await Promise.all(
        addresses.map(async (a) => {
          const otherAddress = a.toLowerCase()
          let lastMessage = 'Message'
          let lastMessageTime = Date.now()
          
          try {
            const rawMsgs = await cc.getMessages(
              addr as `0x${string}`,
              otherAddress as `0x${string}`
            )
            if (rawMsgs.length > 0) {
              const latest = rawMsgs[rawMsgs.length - 1]
              const bytes = hexToBytes(latest.contentHash)
              lastMessage = new TextDecoder().decode(bytes).replace(/\0/g, '').trim() || 'Message'
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
      setConversations(convos)
    } catch (err) {
      console.error('Failed to load conversations:', err)
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
        const rawMsgs = await cc.getMessages(
          addr as `0x${string}`,
          otherAddress as `0x${string}`
        )
        const msgs = rawMsgs.map((m) => {
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
      const { evmAddress } = useWalletStore.getState()
      if (!evmAddress) {
        addToast('error', 'Please connect your wallet first')
        return
      }

      try {
        const contentBytes = new TextEncoder().encode(content)
        const result = await cc.sendDirectMessageChunked(
          recipient.toLowerCase() as `0x${string}`,
          contentBytes
        )
        const message = {
          ...result,
          decryptedContent: content,
        }
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
