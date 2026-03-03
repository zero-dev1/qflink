import React, { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/useMessages'
import { useWallet } from '@/hooks/useWallet'
import { useWalletStore } from '@/stores/wallet'
import { ChatView, EmptyChatView } from '@/components/messages/ChatView'
import { ConversationList } from '@/components/messages/ConversationList'
import { NewMessageModal } from '@/components/messages/NewMessageModal'
import { useState } from 'react'
import { isSubstrateAddress } from '@/lib/utils'
import { deriveEvmAddress } from '@/lib/chain'

const DMChatPage: React.FC = () => {
  const { address: peerAddressParam } = useParams<{ address: string }>()

  // Convert Substrate address to EVM if needed
  const peerAddress = useMemo(() => {
    if (!peerAddressParam) return null
    if (isSubstrateAddress(peerAddressParam)) {
      return deriveEvmAddress(peerAddressParam).toLowerCase()
    }
    return peerAddressParam.toLowerCase()
  }, [peerAddressParam])
  const navigate = useNavigate()
  const { address } = useWallet()
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const { messages, conversations, loadMessages, loadConversations, sendMessage } = useMessages()
  const [showNewMessage, setShowNewMessage] = useState(false)

  useEffect(() => {
    if (!address && !evmAddress) {
      navigate('/direct')
    }
  }, [address, evmAddress, navigate])

  useEffect(() => {
    if (peerAddress && evmAddress) loadMessages(peerAddress)
  }, [peerAddress, evmAddress, loadMessages])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!peerAddress || !evmAddress) return
    const interval = setInterval(() => {
      loadMessages(peerAddress)
    }, 5000)
    return () => clearInterval(interval)
  }, [peerAddress, evmAddress, loadMessages])

  useEffect(() => {
    if (address && evmAddress) {
      loadConversations()
    }
  }, [address, evmAddress, loadConversations])

  const currentMessages = peerAddress ? (messages[peerAddress] || []) : []

  // Track if we're on mobile and a chat is selected
  const isMobileChatActive = peerAddress ? true : false

  const handleSendFromModal = (recipient: string, content: string) => {
    // Convert Substrate address to EVM if needed
    let evmRecipient = recipient.toLowerCase()
    if (isSubstrateAddress(recipient)) {
      evmRecipient = deriveEvmAddress(recipient).toLowerCase()
    }
    sendMessage(evmRecipient, content)
    navigate(`/direct/${evmRecipient}`)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: conversation list - hidden on mobile when chat is active */}
      <div className={`${isMobileChatActive ? 'hidden lg:flex' : 'flex'} h-full w-full lg:w-72 flex-shrink-0`}>
        <ConversationList
          conversations={conversations}
          activeAddress={peerAddress || null}
          onSelect={(addr) => navigate(`/direct/${addr}`)}
          onNewMessage={() => setShowNewMessage(true)}
        />
      </div>

      {/* Right: chat or empty state - full width on mobile when active */}
      {peerAddress ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:static lg:z-auto lg:inset-auto lg:flex-1 lg:min-w-0 lg:h-full lg:w-full lg:overflow-hidden">
          <ChatView
            address={peerAddress}
            messages={currentMessages}
            currentUserAddress={evmAddress || ''}
            onSend={(content) => sendMessage(peerAddress, content)}
            onBack={() => navigate('/direct')}
          />
        </div>
      ) : (
        <EmptyChatView />
      )}

      <NewMessageModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onSend={handleSendFromModal}
      />
    </div>
  )
}

export default DMChatPage
