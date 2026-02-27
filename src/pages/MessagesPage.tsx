import React, { useState, useEffect } from 'react'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatView, EmptyChatView } from '@/components/messages/ChatView'
import { NewMessageModal } from '@/components/messages/NewMessageModal'
import { useMessages } from '@/hooks/useMessages'
import { useWallet } from '@/hooks/useWallet'

const MessagesPage: React.FC = () => {
  const { address } = useWallet()
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    loadConversations,
    loadMessages,
    sendMessage,
  } = useMessages()
  const [showNewMessage, setShowNewMessage] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation)
    }
  }, [activeConversation, loadMessages])

  const handleSendFromChat = (content: string) => {
    if (activeConversation) {
      sendMessage(activeConversation, content)
    }
  }

  const handleSendFromModal = (recipient: string, content: string) => {
    sendMessage(recipient, content)
    setActiveConversation(recipient)
  }

  const currentMessages = activeConversation ? messages[activeConversation] || [] : []

  return (
    <div className="flex h-screen">
      <ConversationList
        conversations={conversations}
        activeAddress={activeConversation}
        onSelect={setActiveConversation}
        onNewMessage={() => setShowNewMessage(true)}
      />

      {activeConversation && address ? (
        <ChatView
          address={activeConversation}
          messages={currentMessages}
          currentUserAddress={address}
          onSend={handleSendFromChat}
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

export default MessagesPage
