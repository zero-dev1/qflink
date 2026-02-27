import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { MessageInput } from './MessageInput'
import { truncateAddress, formatMessageTime } from '@/lib/utils'
import { registryGetProfile } from '@/lib/contracts'
import { getApi } from '@/lib/chain'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface ChatViewProps {
  address: string
  messages: Message[]
  currentUserAddress: string
  onSend: (content: string) => void
}

function mockIsOnline(address: string): boolean {
  // Deterministic mock: online if address char sum is even
  const sum = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % 2 === 0
}

export const ChatView: React.FC<ChatViewProps> = ({
  address,
  messages,
  currentUserAddress,
  onSend,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [peerProfileName, setPeerProfileName] = useState<string | null>(null)
  const profileFetchedRef = useRef<boolean>(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch peer profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address || profileFetchedRef.current) return
      
      profileFetchedRef.current = true
      const api = await getApi()
      
      try {
        const profile = await registryGetProfile(api, address)
        if (profile?.displayName) {
          setPeerProfileName(profile.displayName)
        }
      } catch {}
    }
    
    fetchProfile()
  }, [address])

  const getSenderName = useCallback((senderAddress: string): string => {
    const normalizedSender = senderAddress.toLowerCase()
    const normalizedCurrent = currentUserAddress.toLowerCase()
    
    // Check if it's the current user
    if (normalizedSender === normalizedCurrent) {
      return 'You'
    }
    
    // Check if it's the peer and we have their profile
    if (normalizedSender === address.toLowerCase() && peerProfileName) {
      return peerProfileName
    }
    
    return truncateAddress(senderAddress)
  }, [currentUserAddress, address, peerProfileName])

  const isOnline = useMemo(() => mockIsOnline(address), [address])

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header: back arrow (mobile) + avatar + name/role/online */}
      <div className="flex items-center gap-3 border-b border-qf-border-subtle px-4 py-3">
        <button
          onClick={() => window.history.back()}
          className="flex-shrink-0 text-qf-text-muted hover:text-qf-text-primary transition-colors md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar address={address} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-qf-text-primary">{peerProfileName || truncateAddress(address)}</p>
          <p className="text-xs text-qf-text-secondary">QF Builder</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-qf-success' : 'bg-qf-text-muted'}`} />
            <span className="text-xs text-qf-text-muted">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 bg-qf-card">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-qf-text-muted">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender.toLowerCase() === currentUserAddress.toLowerCase()
            const senderName = getSenderName(msg.sender)
            const content = msg.decryptedContent || 'Encrypted message'
            
            // Check if consecutive from same sender
            const prevMsg = i > 0 ? messages[i - 1] : null
            const isConsecutive = prevMsg && msg.sender.toLowerCase() === prevMsg.sender.toLowerCase()
            
            // Check if should show timestamp (last in group or >2min gap)
            const nextMsg = i < messages.length - 1 ? messages[i + 1] : null
            const isLastInGroup = !nextMsg || nextMsg.sender.toLowerCase() !== msg.sender.toLowerCase()
            const timeGap = prevMsg ? msg.timestamp - prevMsg.timestamp : 0
            const showTimestamp = !isConsecutive || isLastInGroup || timeGap > 2 * 60 * 1000
            
            return (
              <div key={msg.id} className={cn('flex flex-col', isConsecutive ? 'mb-1' : 'mb-4', isMine ? 'items-end' : 'items-start')}>
                {!isMine && !isConsecutive && (
                  <p className="text-xs font-medium text-qf-text-secondary mb-1 px-1">
                    {senderName}
                  </p>
                )}
                <div className={cn(
                  'max-w-[65%] rounded-bubble px-4 py-2.5',
                  isMine ? 'bg-qf-accent text-black' : 'bg-qf-msg-other text-qf-msg-other-text'
                )}>
                  <p className="text-sm break-words leading-relaxed">{content}</p>
                </div>
                {showTimestamp && (
                  <p className="text-xs text-qf-text-muted mt-1 px-1">
                    {formatMessageTime(msg.timestamp)}
                  </p>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={onSend} maxLength={500} />
    </div>
  )
}

export const EmptyChatView: React.FC = () => {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qf-elevated">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qf-text-muted">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-qf-text-primary">Your Messages</h3>
        <p className="mt-1 text-sm text-qf-text-muted">
          Select a conversation or start a new one
        </p>
      </div>
    </div>
  )
}
