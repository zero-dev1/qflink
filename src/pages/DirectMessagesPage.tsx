import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/useMessages'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { ChatView } from '@/components/messages/ChatView'
import { ConversationList } from '@/components/messages/ConversationList'
import { NewMessageModal } from '@/components/messages/NewMessageModal'
import { Button } from '@/components/ui/Button'
import { cn, isSubstrateAddress } from '@/lib/utils'
import { deriveEvmAddress } from '@/lib/chain'
import { markConversationAsRead, getDMUnreadCount } from '@/lib/unreadTracker'
import { useMessagesStore } from '@/stores/messages'
import { sendNotification } from '@/lib/notifications'
import type { Conversation } from '@/types'


const DirectMessagesPage: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useWallet()
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const { messages, conversations, loadMessages, loadConversations, sendMessage } = useMessages()
  const [showNewMessage, setShowNewMessage] = useState(false)
  
  // State for mobile chat toggle (like pod pattern)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  
  // Track previous message counts for notification detection
  const prevMessageCountsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (isConnected && evmAddress) {
      loadConversations()
    }
  }, [isConnected, evmAddress, loadConversations])

  // Poll for new conversations every 10 seconds
  useEffect(() => {
    if (!isConnected || !evmAddress) return
    const interval = setInterval(() => {
      loadConversations()
    }, 10000)
    return () => clearInterval(interval)
  }, [isConnected, evmAddress, loadConversations])

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChatId && evmAddress) {
      loadMessages(selectedChatId)
    }
  }, [selectedChatId, evmAddress, loadMessages])

  // Poll for new messages when chat is selected
  useEffect(() => {
    if (!selectedChatId || !evmAddress) return
    const interval = setInterval(() => {
      loadMessages(selectedChatId)
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedChatId, evmAddress, loadMessages])
  
  // Poll for message counts on ALL conversations to update unread indicators
  useEffect(() => {
    if (!isConnected || !evmAddress || conversations.length === 0) return
    
    const fetchAllMessageCounts = async () => {
      // Load messages for all conversations (not just selected) to update unread counts
      await Promise.all(
        conversations.map(convo => loadMessages(convo.address))
      )
    }
    
    // Initial fetch
    fetchAllMessageCounts()
    
    // Poll every 10 seconds
    const interval = setInterval(fetchAllMessageCounts, 10000)
    return () => clearInterval(interval)
  }, [isConnected, evmAddress, conversations.length])
  
  // Check for new messages and send notifications for non-selected conversations
  useEffect(() => {
    conversations.forEach((convo) => {
      const currentCount = messages[convo.address]?.length || 0
      const prevCount = prevMessageCountsRef.current[convo.address] || 0
      
      // If new messages arrived and conversation is not currently selected
      // prevCount > 0 check prevents notifications on initial load
      if (currentCount > prevCount && selectedChatId !== convo.address && prevCount > 0) {
        const senderName = convo.displayName || convo.address.slice(0, 6) + '...' + convo.address.slice(-4)
        
        sendNotification(
          `New DM from ${senderName}`,
          'You have a new direct message',
          `dm-${convo.address}`,
          () => {
            // Navigate to the conversation when notification is clicked
            handleSelect(convo.address)
          }
        )
      }
      
      // Update the reference
      prevMessageCountsRef.current[convo.address] = currentCount
    })
  }, [messages, conversations, selectedChatId])

  const currentMessages = useMemo(() => {
    return selectedChatId ? (messages[selectedChatId] || []) : []
  }, [messages, selectedChatId])
  
  // Enrich conversations with unread counts and sort by latest activity
  const conversationsWithUnread = useMemo<Conversation[]>(() => {
    const enriched = conversations.map(convo => {
      const msgs = messages[convo.address] || []
      // Only count messages from other users as unread
      const unreadCount = getDMUnreadCount(convo.address, msgs)
      // Get the timestamp of the last message for sorting
      const lastMessageTime = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : (convo.lastMessageTime || 0)
      return {
        ...convo,
        unreadCount,
        lastMessageTime,
      }
    })
    
    // Sort by most recent message timestamp (descending)
    // If no timestamp available, fallback to message count as proxy for activity
    return enriched.sort((a, b) => {
      const timeA = a.lastMessageTime || 0
      const timeB = b.lastMessageTime || 0
      if (timeA !== timeB) {
        return timeB - timeA // Newest first
      }
      // Fallback: sort by unread count (highest first)
      return (b.unreadCount || 0) - (a.unreadCount || 0)
    })
  }, [conversations, messages])

  const handleSelect = (address: string) => {
    // Mark conversation as read before opening
    markConversationAsRead(address)
    
    // On mobile, use state-based navigation
    // On desktop, we could navigate but for now just use state for consistency
    setSelectedChatId(address)
  }

  const handleBack = () => {
    setSelectedChatId(null)
  }

  const handleSendFromModal = async (recipient: string, content: string) => {
    // Convert Substrate address to EVM if needed
    let evmRecipient = recipient.toLowerCase()
    if (isSubstrateAddress(recipient)) {
      evmRecipient = deriveEvmAddress(recipient).toLowerCase()
    }
    await sendMessage(evmRecipient, content)
    // Mark as read so sender doesn't see their own message as unread
    // (own messages are now filtered out in unread count anyway)
    markConversationAsRead(evmRecipient)
    setSelectedChatId(evmRecipient)
  }

  const handleSend = async (content: string) => {
    if (selectedChatId) {
      await sendMessage(selectedChatId, content)
      // Mark as read so sender doesn't see their own message as unread
      // (own messages are now filtered out in unread count anyway)
      markConversationAsRead(selectedChatId)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Direct Messages</h2>
        <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to view messages</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Left column: Conversation list - hidden on mobile when chat selected */}
      <div className={cn(
        "flex h-full w-full md:w-72 flex-shrink-0 bg-white dark:bg-[#0D0D0D]",
        selectedChatId ? "hidden md:flex" : "flex"
      )}>
        <ConversationList
          conversations={conversationsWithUnread}
          activeAddress={selectedChatId}
          onSelect={handleSelect}
          onNewMessage={() => setShowNewMessage(true)}
        />
      </div>

      {/* Center/Right: Chat view or empty state */}
      <div className="flex-1 flex min-w-0">
        {selectedChatId ? (
          /* Chat view - fixed overlay on mobile, inline on desktop */
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] md:static md:z-auto md:inset-auto md:h-full md:w-full">
            <ChatView
              address={selectedChatId}
              messages={currentMessages}
              currentUserAddress={evmAddress || ''}
              onSend={handleSend}
              onBack={handleBack}
            />
          </div>
        ) : (
          /* Empty state on desktop when no conversation selected */
          <div className="hidden md:flex flex-1 items-center justify-center bg-white dark:bg-[#0D0D0D]">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qx-elevated">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qx-text-muted">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-qx-text-primary">Your Messages</h3>
              <p className="mt-1 text-sm text-qx-text-muted">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      <NewMessageModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onSend={handleSendFromModal}
      />
    </div>
  )
}

export default DirectMessagesPage
