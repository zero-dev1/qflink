import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PodInfo } from './PodInfo'
import { MessageInput } from '@/components/messages/MessageInput'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { truncateAddress, formatMessageTime, formatBalance } from '@/lib/utils'
import { registryGetProfile } from '@/lib/contracts'
import { getApi } from '@/lib/chain'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import type { Pod, PodMessage, DefaultPod } from '@/types'
import { cn } from '@/lib/utils'

interface PodChatProps {
  pod: Pod
  messages: PodMessage[]
  members: string[]
  currentUserAddress: string
  userBalance: bigint
  onSend: (content: string) => void
  onBack: () => void
  onInvite?: () => void
  onLeave?: () => void
}

const formatHolderReq = (minBal: bigint): string => {
  const whole = minBal / (10n ** 18n)
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(0)}M+ Holders`
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K+ Holders`
  return `${whole}+ Holders`
}

export const PodChat: React.FC<PodChatProps> = ({
  pod,
  messages,
  members,
  currentUserAddress,
  userBalance,
  onSend,
  onBack,
  onInvite,
  onLeave,
}) => {
  // Debug: log when messages update
  console.log('[PodChat] messages updated, count:', messages?.length)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [senderProfiles, setSenderProfiles] = useState<Map<string, string>>(new Map())
  const profilesFetchedRef = useRef<Set<string>>(new Set())
  
  const defaultPods = usePodsStore((s) => s.defaultPods)
  const myPods = usePodsStore((s) => s.myPods)
  // Deduplicate pods when combining defaultPods and myPods
  const allMyPods = [...new Map([...defaultPods, ...myPods].map(p => [p.id, p])).values()]
  const evmAddress = useWalletStore((s) => s.evmAddress)
  
  const getSenderName = (senderAddress: string): string => {
    // Check if it's the current user
    if (evmAddress && senderAddress.toLowerCase() === evmAddress.toLowerCase()) {
      return 'You'
    }
    
    // Check cached profile
    const profileName = senderProfiles.get(senderAddress.toLowerCase())
    if (profileName) {
      return profileName
    }
    
    return truncateAddress(senderAddress)
  }
  
  // Fetch profiles for all unique senders
  useEffect(() => {
    const fetchProfiles = async () => {
      const uniqueSenders = new Set<string>()
      messages.forEach(msg => {
        const addr = msg.sender.toLowerCase()
        if (addr !== evmAddress?.toLowerCase() && !profilesFetchedRef.current.has(addr)) {
          uniqueSenders.add(msg.sender)
        }
      })
      
      if (uniqueSenders.size === 0) return
      
      const api = await getApi()
      const newProfiles = new Map(senderProfiles)
      
      await Promise.all(Array.from(uniqueSenders).map(async (addr) => {
        profilesFetchedRef.current.add(addr.toLowerCase())
        try {
          const profile = await registryGetProfile(api, addr)
          if (profile?.displayName) {
            newProfiles.set(addr.toLowerCase(), profile.displayName)
          }
        } catch {}
      }))
      
      setSenderProfiles(newProfiles)
    }
    
    fetchProfiles()
  }, [messages, evmAddress])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isDefault = (pod as DefaultPod).isDefault === true
  const holderReq = isDefault ? formatHolderReq((pod as DefaultPod).minBalance) : ''

  return (
    <div className="flex h-full">
      {/* Left column: YOUR PODS list (desktop only) */}
      <div className="hidden md:flex w-48 flex-shrink-0 flex-col border-r border-qf-border-subtle bg-qf-bg">
        <div className="px-4 py-3 border-b border-qf-border-subtle">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-qf-text-muted">Your Pods</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {allMyPods.map((p) => {
            const isActive = p.id === pod.id
            const pIsDefault = (p as DefaultPod).isDefault === true
            const pHolderReq = pIsDefault ? formatHolderReq((p as DefaultPod).minBalance) : 'Open'
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/pod/${p.id}`)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors border-l-2',
                  isActive
                    ? 'bg-qf-active-bg border-l-qf-accent'
                    : 'border-l-transparent hover:bg-qf-elevated'
                )}
              >
                <p className={cn('text-sm font-semibold truncate', isActive ? 'text-qf-active-text' : 'text-qf-text-primary')}>
                  {p.name}
                </p>
                <p className="text-xs text-qf-text-muted truncate">{pHolderReq}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center column: chat */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-qf-border-subtle px-4 py-3">
          <button onClick={onBack} className="flex-shrink-0 text-qf-text-muted hover:text-qf-text-primary transition-colors md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-qf-text-primary">{pod.name}</h3>
            {holderReq && <p className="text-xs text-qf-text-secondary">{holderReq}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-qf-text-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm text-qf-text-secondary">Open</span>
            </div>
            <button className="text-qf-text-secondary hover:text-qf-text-primary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance sub-header: only show when user does NOT yet qualify */}
        {isDefault && userBalance < (pod as DefaultPod).minBalance && (() => {
          const minBal = (pod as DefaultPod).minBalance
          const remaining = minBal - userBalance
          const fmtBal = (v: bigint) => {
            const w = v / (10n ** 18n)
            if (w >= 1_000_000n) return `${(Number(w) / 1_000_000).toFixed(1)}M`
            if (w >= 1_000n) return `${(Number(w) / 1_000).toFixed(0)}K`
            return w.toString()
          }
          return (
            <div className="border-b border-qf-border-subtle px-5 py-3 bg-qf-bg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-qf-text-secondary">
                  You hold <span className="font-bold text-qf-text-primary">{fmtBal(userBalance)} QF</span>
                </p>
                <p className="text-xs text-qf-text-muted">{fmtBal(remaining)} to go</p>
              </div>
              <ProgressBar current={userBalance} target={minBal} showLabels={false} />
            </div>
          )
        })()}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-qf-card">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-qf-text-muted">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = evmAddress && msg.sender.toLowerCase() === evmAddress.toLowerCase()
              const senderName = getSenderName(msg.sender)
              
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
                    <p className="text-sm break-words leading-relaxed">{msg.content}</p>
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

      {/* Right column: Pod Info */}
      <PodInfo
        pod={pod}
        members={members}
        messages={messages}
        currentUserAddress={currentUserAddress}
        userBalance={userBalance}
        onInvite={onInvite}
        onLeave={onLeave}
      />
    </div>
  )
}
