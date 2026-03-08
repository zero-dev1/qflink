import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PodInfo } from './PodInfo'
import { MessageInput } from '@/components/messages/MessageInput'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { truncateAddress, formatMessageTime, formatBalance } from '@/lib/utils'
import { TokenGateBar } from './TokenGateBar'
import { getProfile } from '@/lib/contractCalls'
import { reverseResolve } from '@/lib/qns'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import type { Pod, PodMessage, DefaultPod, CustomPod } from '@/types'
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
  onRefreshMembers?: () => void
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
  onRefreshMembers,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)
  const navigate = useNavigate()
  const [senderProfiles, setSenderProfiles] = useState<Map<string, string>>(new Map())
  const [senderQFNames, setSenderQFNames] = useState<Map<string, string>>(new Map())
  const profilesFetchedRef = useRef<Set<string>>(new Set())
  const qfNamesFetchedRef = useRef<Set<string>>(new Set())
  const [showPodInfo, setShowPodInfo] = useState(false)
  
  const myPods = usePodsStore((s) => s.myPods)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  
  const getSenderName = (senderAddress: string): string => {
    const normalizedAddr = senderAddress.toLowerCase()
    
    // Check if it's the current user
    if (evmAddress && normalizedAddr === evmAddress.toLowerCase()) {
      return 'You'
    }
    
    // Check QNS name first (priority)
    const qfName = senderQFNames.get(normalizedAddr)
    if (qfName) {
      return qfName
    }
    
    // Check cached profile
    const profileName = senderProfiles.get(normalizedAddr)
    if (profileName) {
      return profileName
    }
    
    return truncateAddress(senderAddress)
  }
  
  // Fetch profiles and QNS names for all unique senders
  useEffect(() => {
    const fetchData = async () => {
      const uniqueSenders = new Set<string>()
      messages.forEach(msg => {
        const addr = msg.sender.toLowerCase()
        if (addr !== evmAddress?.toLowerCase()) {
          if (!profilesFetchedRef.current.has(addr)) {
            uniqueSenders.add(msg.sender)
          }
        }
      })
      
      if (uniqueSenders.size === 0) return
      
      const newProfiles = new Map(senderProfiles)
      const newQFNames = new Map(senderQFNames)
      
      await Promise.all(Array.from(uniqueSenders).map(async (addr) => {
        const lowerAddr = addr.toLowerCase()
        profilesFetchedRef.current.add(lowerAddr)
        
        // Fetch both profile and QNS name in parallel
        try {
          const profile = await getProfile(addr as `0x${string}`)
          if (profile?.displayName) {
            newProfiles.set(lowerAddr, profile.displayName)
          }
        } catch {}
        
        try {
          const qfName = await reverseResolve(addr)
          if (qfName) {
            newQFNames.set(lowerAddr, qfName)
            qfNamesFetchedRef.current.add(lowerAddr)
          }
        } catch {}
      }))
      
      setSenderProfiles(newProfiles)
      setSenderQFNames(newQFNames)
    }
    
    fetchData()
  }, [messages, evmAddress])

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

  const isDefault = (pod as DefaultPod).isDefault === true
  const isCustom = !isDefault
  const customPod = isCustom ? (pod as CustomPod) : null
  const holderReq = isDefault ? formatHolderReq((pod as DefaultPod).minBalance) : ''
  const minBalance = (pod as DefaultPod).minBalance ?? BigInt(0)

  // Extract unique sender addresses from messages for member count
  const uniqueSenders = React.useMemo(() => {
    const senders = new Set<string>()
    messages.forEach(msg => senders.add(msg.sender))
    return Array.from(senders)
  }, [messages])

  const activeMemberCount = uniqueSenders.length

  // Mobile pod info overlay
  if (showPodInfo) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4 py-3">
          <button 
            onClick={() => setShowPodInfo(false)} 
            className="flex-shrink-0 text-qx-text-muted hover:text-qx-text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-qx-text-primary">Pod Info</h3>
          </div>
        </div>

        {/* Pod Info Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* About */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">About</h4>
            <p className="text-sm text-qx-text-secondary leading-relaxed">{pod.description}</p>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Requirements</h4>
            {isDefault ? (
              <p className="text-sm text-qx-text-secondary">
                Requires {formatBalance(minBalance)} QF aggregated balance
              </p>
            ) : (
              <div className="space-y-2">
                {customPod?.tier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Tier</span>
                    <span className="capitalize font-medium text-qx-text-primary">{customPod.tier}</span>
                  </div>
                )}
                {customPod?.joinMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Join Method</span>
                    <span className="capitalize font-medium text-qx-text-primary">
                      {customPod.joinMethod === 'balance' ? 'Balance-Based' : 'Invite-Only'}
                    </span>
                  </div>
                )}
                {customPod?.minBalance !== undefined && customPod.minBalance > 0n && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Min Balance</span>
                    <span className="font-medium text-cyan-600">{formatBalance(customPod.minBalance)} QF</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Members</h4>
            <p className="text-sm text-qx-text-secondary">
              Open to qualified holders
              {activeMemberCount > 0 && (
                <span className="ml-1 text-cyan-600">({activeMemberCount} active)</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 px-4 pb-6 pt-2 space-y-3 border-t border-gray-200 dark:border-gray-800">
          {onInvite && (
            <button
              onClick={() => {
                setShowPodInfo(false)
                onInvite()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-qx-border-prominent px-3 py-3 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Invite Link
            </button>
          )}

          {onLeave && (
            <button
              onClick={() => {
                setShowPodInfo(false)
                onLeave()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave Pod
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left column: YOUR PODS list (desktop only) */}
      <div className="hidden lg:flex w-48 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-qx-text-muted">Your Pods</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {myPods.map((p) => {
            const isActive = p.id === pod.id
            const pIsDefault = (p as DefaultPod).isDefault === true
            const pHolderReq = pIsDefault ? formatHolderReq((p as DefaultPod).minBalance) : 'Open'
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/pod/${p.id}`)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors border-l-2 border-b border-b-gray-200 dark:border-b-gray-800',
                  isActive
                    ? 'border-l-cyan-600 bg-gray-100 dark:bg-white/5'
                    : 'border-l-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                )}
              >
                <p className="text-sm font-semibold truncate text-qx-text-primary">
                  {p.name}
                </p>
                <p className="text-xs text-qx-text-muted truncate">{pHolderReq}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center column: chat */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Chat header */}
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4 py-3">
          <button onClick={onBack} className="flex-shrink-0 text-qx-text-muted hover:text-qx-text-primary transition-colors lg:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-qx-text-primary">{pod.name}</h3>
            {holderReq && <p className="text-xs text-qx-text-secondary">{holderReq}</p>}
            {/* TokenGateBar for pods with threshold > 0 */}
            {minBalance > 0n && (
              <div className="mt-1.5 max-w-xs">
                <TokenGateBar userBalance={userBalance} threshold={minBalance} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowPodInfo(true)}
              className="flex items-center gap-1.5 text-qx-text-secondary hover:text-qx-text-primary transition-colors lg:hidden"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm">Open</span>
            </button>
            <button className="text-qx-text-secondary hover:text-qx-text-primary transition-colors">
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
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-5 py-3 bg-white dark:bg-[#0D0D0D]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-qx-text-secondary">
                  You hold <span className="font-bold text-qx-text-primary">{fmtBal(userBalance)} QF</span>
                </p>
                <p className="text-xs text-qx-text-muted">{fmtBal(remaining)} to go</p>
              </div>
              <ProgressBar current={userBalance} target={minBal} showLabels={false} />
            </div>
          )
        })()}

        {/* Messages */}
        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-5 py-4 bg-gray-50 dark:bg-white/[0.03]">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-qx-text-muted">No messages yet. Start the conversation!</p>
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
                    <p className={cn(
                      'text-xs font-medium mb-1 px-1',
                      senderQFNames.get(msg.sender.toLowerCase()) ? 'text-cyan-600' : 'text-qx-text-secondary'
                    )}>
                      {senderName}
                    </p>
                  )}
                  <div className={cn(
                    'max-w-[65%] rounded-bubble px-4 py-2.5',
                    isMine ? 'bg-cyan-600 text-white' : 'bg-qx-msg-other text-qx-msg-other-text'
                  )}>
                    <p className="text-sm break-words leading-relaxed">{msg.content}</p>
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

      {/* Right column: Pod Info (desktop only) */}
      <div className="hidden lg:block">
        <PodInfo
          pod={pod}
          members={members}
          messages={messages}
          currentUserAddress={currentUserAddress}
          userBalance={userBalance}
          onInvite={onInvite}
          onLeave={onLeave}
          onRefreshMembers={onRefreshMembers}
        />
      </div>
    </div>
  )
}
