import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePodsStore } from '@/stores/pods'
import { useMessagesStore } from '@/stores/messages'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { truncateAddress, formatTimestamp } from '@/lib/utils'
import { registryGetProfile } from '@/lib/contracts'
import { getApi } from '@/lib/chain'
import type { DefaultPod, Pod } from '@/types'

const formatHolderLabel = (minBal: bigint): string => {
  const whole = minBal / (10n ** 18n)
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(0)}M+ Holders`
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K+ Holders`
  return `${whole}+ Holders`
}

const relativeTimeHome = (timestamp: number): string => {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const fmtRemaining = (current: bigint, target: bigint): string => {
  const remaining = target > current ? target - current : 0n
  if (remaining === 0n) return 'Qualified ✓'
  const whole = remaining / (10n ** 18n)
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(1)}M to go`
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}k to go`
  return `${whole} to go`
}

const HomePage: React.FC = () => {
  const { address, balance, isConnected } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const myPods = usePodsStore((s) => s.myPods)
  const defaultPods = usePodsStore((s) => s.defaultPods)
  const isLoadingPods = usePodsStore((s) => s.isLoading)
  const conversations = useMessagesStore((s) => s.conversations)
  const fetchConversations = useMessagesStore((s) => s.fetchConversations)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const navigate = useNavigate()
  
  // Load conversations when connected
  useEffect(() => {
    if (isConnected && evmAddress) {
      fetchConversations()
    }
  }, [isConnected, evmAddress, fetchConversations])

  // Poll for new conversations every 10 seconds
  useEffect(() => {
    if (!isConnected || !evmAddress) return
    const interval = setInterval(() => {
      fetchConversations()
    }, 10000)
    return () => clearInterval(interval)
  }, [isConnected, evmAddress, fetchConversations])
  
  // Profile name cache for conversations
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map())
  const profilesFetchedRef = useRef<Set<string>>(new Set())
  
  // Fetch profiles for conversation addresses
  useEffect(() => {
    const fetchProfiles = async () => {
      const addressesToFetch = conversations
        .map(c => c.address.toLowerCase())
        .filter(addr => !profilesFetchedRef.current.has(addr))
      
      if (addressesToFetch.length === 0) return
      
      const api = await getApi()
      const newProfiles = new Map(profileNames)
      
      await Promise.all(addressesToFetch.map(async (addr) => {
        profilesFetchedRef.current.add(addr)
        try {
          const profile = await registryGetProfile(api, addr)
          if (profile?.displayName) {
            newProfiles.set(addr, profile.displayName)
          }
        } catch {}
      }))
      
      setProfileNames(newProfiles)
    }
    
    fetchProfiles()
  }, [conversations])

  const allMyPods = [...defaultPods, ...myPods].filter((p, i, arr) => 
    arr.findIndex(x => x.id === p.id) === i
  )

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-qf-accent/10">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qf-accent">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-qf-text-primary mb-2">Welcome to QFLink</h2>
        <p className="text-sm text-qf-text-secondary mb-6 max-w-md">
          Decentralized, wallet-gated messaging for QF holders. Connect your wallet to join exclusive Pods based on your holdings.
        </p>
        <button
          onClick={() => setShowConnectWallet(true)}
          className="rounded-lg bg-qf-accent px-6 py-3 text-sm font-semibold text-qf-accent-text hover:bg-qf-accent-hover transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Your Pods */}
      <section>
        <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Your Pods</h2>

        {isLoadingPods ? (
          <div className="border border-qf-card-border bg-qf-card p-8 text-center">
            <p className="text-sm text-qf-text-secondary">Loading pods...</p>
          </div>
        ) : allMyPods.length === 0 ? (
          <div className="border border-qf-card-border bg-qf-card p-8 text-center">
            <p className="text-sm text-qf-text-secondary">
              You don't have enough QF to join any pods. Get more QF to unlock exclusive communities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMyPods.map((pod) => (
              <PodHomeCard
                key={pod.id}
                pod={pod}
                userBalance={balance}
                unreadCount={0}
                onClick={() => navigate(`/pod/${pod.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Direct Messages */}
      <section>
        <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Direct</h2>

        {conversations.length === 0 ? (
          <div className="border border-qf-card-border bg-qf-card p-8 text-center">
            <p className="text-sm text-qf-text-secondary">
              No conversations yet. Find someone in a pod and start chatting!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              console.log('[HomePage] conversations:', conversations.map(c => ({ 
                address: c.address, 
                lastMessage: c.lastMessage, 
                lastMessageTime: c.lastMessageTime,
                keys: Object.keys(c)
              })))
              return null
            })()}
            {conversations.slice(0, 4).map((convo) => (
              <button
                key={convo.address}
                onClick={() => navigate(`/direct/${convo.address}`)}
                className="flex items-center gap-3 border border-qf-card-border bg-qf-card p-4 text-left transition-[border-color,transform] duration-150 hover:border-qf-accent hover:-translate-y-0.5"
              >
                <Avatar address={convo.address} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-qf-text-primary truncate">
                    {profileNames.get(convo.address.toLowerCase()) || truncateAddress(convo.address)}
                  </p>
                  {(convo.lastMessage || convo.lastMessageTime) && (
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      {convo.lastMessage && (
                        <p className="text-xs text-qf-text-secondary truncate flex-1">{convo.lastMessage}</p>
                      )}
                      {convo.lastMessageTime && (
                        <span className="text-xs text-qf-text-muted flex-shrink-0">
                          {relativeTimeHome(convo.lastMessageTime)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {convo.unreadCount > 0 && (
                  <span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-qf-accent px-1 text-xs font-bold text-black">
                    {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface PodHomeCardProps {
  pod: Pod
  userBalance: bigint
  unreadCount?: number
  onClick: () => void
}

const PodHomeCard: React.FC<PodHomeCardProps> = ({
  pod,
  userBalance,
  unreadCount = 0,
  onClick,
}) => {
  const isDefault = 'isDefault' in pod && pod.isDefault
  const minBal = isDefault ? (pod as DefaultPod).minBalance : ((pod as any).minBalance || 0n)
  const holderLabel = isDefault ? formatHolderLabel(minBal) : 'Open'

  const podMessages = usePodsStore((s) => s.podMessages)
  const lastMsg = podMessages[pod.id]?.[podMessages[pod.id]?.length - 1]

  return (
    <button
      onClick={onClick}
      className="flex flex-col border border-qf-card-border bg-qf-card p-4 text-left transition-[border-color,transform] duration-150 hover:border-qf-accent hover:-translate-y-0.5"
    >
      {/* Row 1: name + unread badge + arrow */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-semibold text-qf-text-primary truncate">{pod.name}</h3>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-qf-accent px-1 text-xs font-bold text-black">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qf-text-muted flex-shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Row 2: holder label */}
      <p className="text-xs text-qf-text-secondary mb-3">{holderLabel}</p>

      {/* Row 3: progress bar (default pods) OR last message */}
      {isDefault && minBal > 0n ? (
        <>
          <ProgressBar current={userBalance} target={minBal} showLabels={false} />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-qf-text-muted">{fmtRemaining(userBalance, minBal)}</span>
            {lastMsg && (
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qf-text-muted">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs text-qf-text-muted">{formatTimestamp(lastMsg.timestamp)}</span>
              </div>
            )}
          </div>
        </>
      ) : lastMsg ? (
        <>
          <p className="text-xs text-qf-text-secondary truncate">{lastMsg.content}</p>
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qf-text-muted">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs text-qf-text-muted">{formatTimestamp(lastMsg.timestamp)}</span>
          </div>
        </>
      ) : null}
    </button>
  )
}

export default HomePage
