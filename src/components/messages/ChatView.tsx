import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { MessageInput } from './MessageInput'
import { truncateAddress, formatMessageTime } from '@/lib/utils'
import { getProfile } from '@/lib/contractCalls'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface ChatViewProps {
  address: string
  messages: Message[]
  currentUserAddress: string
  onSend: (content: string) => void
  onBack?: () => void
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
  onBack,
}) => {
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)
  const [peerProfileName, setPeerProfileName] = useState<string | null>(null)
  const [senderProfiles, setSenderProfiles] = useState<Map<string, string>>(new Map())
  const profileFetchedRef = useRef<boolean>(false)
  const senderProfilesFetchedRef = useRef<Set<string>>(new Set())

  const handleScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Fetch peer profile (the person we're chatting with)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address || profileFetchedRef.current) return
      
      profileFetchedRef.current = true
      
      try {
        const profile = await getProfile(address as `0x${string}`)
        if (profile?.displayName) {
          setPeerProfileName(profile.displayName)
        }
      } catch {}
    }
    
    fetchProfile()
  }, [address])

  // Fetch profiles for all message senders
  useEffect(() => {
    const fetchSenderProfiles = async () => {
      const uniqueSenders = new Set<string>()
      messages.forEach(msg => {
        const senderAddr = msg.sender.toLowerCase()
        // Don't fetch for current user or already fetched
        if (senderAddr !== currentUserAddress.toLowerCase() && !senderProfilesFetchedRef.current.has(senderAddr)) {
          uniqueSenders.add(msg.sender)
        }
      })
      
      if (uniqueSenders.size === 0) return
      
      const newProfiles = new Map(senderProfiles)
      
      await Promise.all(Array.from(uniqueSenders).map(async (senderAddr) => {
        senderProfilesFetchedRef.current.add(senderAddr.toLowerCase())
        try {
          const profile = await getProfile(senderAddr as `0x${string}`)
          if (profile?.displayName) {
            newProfiles.set(senderAddr.toLowerCase(), profile.displayName)
          }
        } catch {}
      }))
      
      setSenderProfiles(newProfiles)
    }
    
    fetchSenderProfiles()
  }, [messages, currentUserAddress])

  const getSenderName = useCallback((senderAddress: string): string => {
    const normalizedSender = senderAddress.toLowerCase()
    const normalizedCurrent = currentUserAddress.toLowerCase()
    
    // Check if it's the current user
    if (normalizedSender === normalizedCurrent) {
      return 'You'
    }
    
    // Check cached profile from message senders
    const cachedProfile = senderProfiles.get(normalizedSender)
    if (cachedProfile) {
      return cachedProfile
    }
    
    // Check if it's the peer and we have their profile
    if (normalizedSender === address.toLowerCase() && peerProfileName) {
      return peerProfileName
    }
    
    return truncateAddress(senderAddress)
  }, [currentUserAddress, address, peerProfileName, senderProfiles])

  const isOnline = useMemo(() => mockIsOnline(address), [address])

  const handleNavigateToProfile = () => {
    navigate(`/profile/${address}`)
  }

  return (
    <div className="flex flex-1 flex-col h-full w-full overflow-hidden">
      {/* Header: back arrow (mobile) + avatar + name/role/online */}
      <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4 py-3">
        <button
          onClick={onBack || (() => window.history.back())}
          className="flex-shrink-0 text-qx-text-muted hover:text-qx-text-primary transition-colors lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        {/* Clickable avatar and name to navigate to profile */}
        <button 
          onClick={handleNavigateToProfile}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <Avatar address={address} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-qx-text-primary">{peerProfileName || <span className="font-mono">{truncateAddress(address)}</span>}</p>
            <p className="text-xs text-qx-text-secondary">QF Builder</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-qx-success' : 'bg-qx-text-muted'}`} />
              <span className="text-xs text-qx-text-muted">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </button>
      </div>

      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-5 py-4 bg-qx-card">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-qx-text-muted">No messages yet. Say hello!</p>
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
                  <button 
                    onClick={() => navigate(`/profile/${msg.sender}`)}
                    className="text-xs font-medium text-qx-text-secondary mb-1 px-1 hover:text-cyan-600 transition-colors text-left"
                  >
                    {senderName}
                  </button>
                )}
                <div className={cn(
                  'max-w-[65%] rounded-bubble px-4 py-2.5',
                  isMine ? 'bg-cyan-600 text-white' : 'bg-qx-msg-other text-qx-msg-other-text'
                )}>
                  <p className="text-sm break-words leading-relaxed">{content}</p>
                </div>
                {showTimestamp && (
                  <p className="text-xs text-qx-text-muted mt-1 px-1">
                    {formatMessageTime(msg.timestamp)}
                  </p>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0">
        <MessageInput onSend={onSend} maxLength={500} />
      </div>
    </div>
  )
}

export const EmptyChatView: React.FC = () => {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qx-elevated">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qx-text-muted">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-qx-text-primary">Your Messages</h3>
        <p className="mt-1 text-sm text-qx-text-muted">
          Select a conversation or start a new one
        </p>
      </div>
    </div>
  )
}
