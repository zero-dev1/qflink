import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/useMessages'
import { useWallet } from '@/hooks/useWallet'
import { useWalletStore } from '@/stores/wallet'
import { ChatView, EmptyChatView } from '@/components/messages/ChatView'
import { ConversationList } from '@/components/messages/ConversationList'
import { NewMessageModal } from '@/components/messages/NewMessageModal'
import { useState, useMemo } from 'react'
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
      console.log('[DMChatPage] Both address and EVM address available, calling loadConversations()...')
      loadConversations()
    }
  }, [address, evmAddress, loadConversations])

  const currentMessages = peerAddress ? (messages[peerAddress] || []) : []

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
      {/* Left: conversation list */}
      <ConversationList
        conversations={conversations}
        activeAddress={peerAddress || null}
        onSelect={(addr) => navigate(`/direct/${addr}`)}
        onNewMessage={() => setShowNewMessage(true)}
      />

      {/* Right: chat or empty state */}
      {peerAddress ? (
        <ChatView
          address={peerAddress}
          messages={currentMessages}
          currentUserAddress={evmAddress || ''}
          onSend={(content) => sendMessage(peerAddress, content)}
        />
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
