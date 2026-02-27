import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/useMessages'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { ConversationList } from '@/components/messages/ConversationList'
import { NewMessageModal } from '@/components/messages/NewMessageModal'
import { Button } from '@/components/ui/Button'
import { isSubstrateAddress } from '@/lib/utils'
import { deriveEvmAddress } from '@/lib/chain'

const DirectMessagesPage: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useWallet()
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const { conversations, loadConversations, sendMessage } = useMessages()
  const [showNewMessage, setShowNewMessage] = useState(false)

  useEffect(() => {
    console.log('[DirectMessagesPage] useEffect triggered - isConnected:', isConnected, 'evmAddress:', evmAddress)
    if (isConnected && evmAddress) {
      console.log('[DirectMessagesPage] Both connected and EVM address available, calling loadConversations()...')
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

  const handleSelect = (address: string) => {
    navigate(`/direct/${address}`)
  }

  const handleSendFromModal = (recipient: string, content: string) => {
    // Convert Substrate address to EVM if needed
    let evmRecipient = recipient.toLowerCase()
    if (isSubstrateAddress(recipient)) {
      evmRecipient = deriveEvmAddress(recipient).toLowerCase()
    }
    sendMessage(evmRecipient, content)
    navigate(`/direct/${evmRecipient}`)
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Direct Messages</h2>
        <p className="text-sm text-qf-text-muted mb-6">Connect your wallet to view messages</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <ConversationList
        conversations={conversations}
        activeAddress={null}
        onSelect={handleSelect}
        onNewMessage={() => setShowNewMessage(true)}
      />

      {/* Empty state on desktop when no conversation selected */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-qf-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qf-elevated">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qf-text-muted">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-qf-text-primary">Your Messages</h3>
          <p className="mt-1 text-sm text-qf-text-muted">Select a conversation or start a new one</p>
        </div>
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
