import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePodsStore } from '@/stores/pods'
import { useMessagesStore } from '@/stores/messages'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { Avatar } from '@/components/ui/Avatar'
import { TokenGateBar } from '@/components/pods/TokenGateBar'
import { truncateAddress, formatTimestamp, formatCompactBalance, cn } from '@/lib/utils'
import { reverseResolve } from '@/lib/qns'
import type { DefaultPod, Pod } from '@/types'

const formatHolderLabel = (minBal: bigint): string => `${formatCompactBalance(minBal)} QF`

const relativeTimeHome = (timestamp: number): string => {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
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
  const [qfNames, setQfNames] = useState<Map<string, string>>(new Map())
  const qfNamesFetchedRef = React.useRef<Set<string>>(new Set())
  
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

  // Fetch QNS names for conversation addresses
  useEffect(() => {
    const fetchQfNames = async () => {
      const newQfNames = new Map(qfNames)
      
      await Promise.all(conversations.map(async (convo) => {
        const lowerAddr = convo.address.toLowerCase()
        if (qfNamesFetchedRef.current.has(lowerAddr)) return
        
        qfNamesFetchedRef.current.add(lowerAddr)
        try {
          const qfName = await reverseResolve(convo.address)
          if (qfName) {
            newQfNames.set(lowerAddr, qfName)
          }
        } catch {}
      }))
      
      setQfNames(newQfNames)
    }
    
    fetchQfNames()
  }, [conversations])

  // Show user's joined pods + all default pods for discovery
  // Per spec: Home page shows default pods (Chefs, Whale, Builders) alongside user's pods
  // Dedup ensures no double-showing if user has joined a default pod
  const allDisplayPods = [...myPods, ...defaultPods].filter((p, i, arr) => 
    arr.findIndex(x => x.id === p.id) === i
  )

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-600/10">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-600">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-qx-text-primary mb-2">Welcome to QFLink</h2>
        <p className="text-sm text-qx-text-secondary mb-6 max-w-md">
          Decentralized, wallet-gated messaging for QF holders. Connect your wallet to join exclusive Pods based on your holdings.
        </p>
        <button
          onClick={() => setShowConnectWallet(true)}
          className="bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
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
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Your Pods</h2>

        {isLoadingPods ? (
          <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-8 text-center">
            <p className="text-sm text-qx-text-secondary">Loading pods...</p>
          </div>
        ) : allDisplayPods.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-8 text-center">
            <p className="text-sm text-qx-text-secondary mb-4">
              Welcome to QFLink — your on-chain messaging hub. Browse and join pods to start chatting with communities.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Explore Pods
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDisplayPods.map((pod) => {
              const isMember = myPods.some(p => p.id === pod.id)
              return (
                <PodHomeCard
                  key={pod.id}
                  pod={pod}
                  userBalance={balance}
                  unreadCount={0}
                  onClick={() => navigate(isMember ? `/pods/${pod.id}` : '/explore')}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Direct Messages */}
      <section>
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Direct</h2>

        {conversations.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-8 text-center">
            <p className="text-sm text-qx-text-secondary">
              No conversations yet. Find someone in a pod and start chatting!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {conversations.slice(0, 4).map((convo) => (
              <button
                key={convo.address}
                onClick={() => navigate(`/direct/${convo.address}`)}
                className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 bg-transparent p-4 text-left transition-[border-color,transform] duration-150 hover:border-cyan-600 hover:-translate-y-0.5"
              >
                <Avatar address={convo.address} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    qfNames.get(convo.address.toLowerCase()) ? 'text-cyan-600' : 'text-qx-text-primary'
                  )}>
                    {qfNames.get(convo.address.toLowerCase()) || truncateAddress(convo.address)}
                  </p>
                  {(convo.lastMessage || convo.lastMessageTime) && (
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      {convo.lastMessage && (
                        <p className="text-xs text-qx-text-secondary truncate flex-1">{convo.lastMessage}</p>
                      )}
                      {convo.lastMessageTime && (
                        <span className="text-xs text-qx-text-muted flex-shrink-0">
                          {relativeTimeHome(convo.lastMessageTime)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {convo.unreadCount > 0 && (
                  <span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-xs font-bold text-white">
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
  const category = isDefault
    ? 'featured'
    : ((pod as any).category || 'custom')
  const description = isDefault
    ? (pod as DefaultPod).description
    : ((pod as any).description || '')

  const podMessages = usePodsStore((s) => s.podMessages)
  const lastMsg = podMessages[pod.id]?.[podMessages[pod.id]?.length - 1]

  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-transparent border border-gray-200 dark:border-gray-800 p-5 text-left transition-[border-color,transform] duration-150 hover:border-cyan-600 hover:-translate-y-0.5"
    >
      {/* Badge label for Featured (top-left) */}
      {isDefault && (
        <p className="text-xs text-qx-text-secondary dark:text-gray-400 mb-2">Featured</p>
      )}

      {/* Pod name with unread badge */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xl font-bold text-qx-text-primary truncate">
            {pod.name}
          </h3>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Category badge */}
      <p className="text-xs text-cyan-600 uppercase tracking-wider font-semibold mb-2">
        {category}
      </p>

      {/* TokenGateBar for pods with threshold > 0 */}
      {minBal > 0n && (
        <div className="mb-3">
          <TokenGateBar userBalance={userBalance} threshold={minBal} />
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-qx-text-secondary mb-3 line-clamp-2 overflow-hidden text-ellipsis">
          {description}
        </p>
      )}

      {/* Divider */}
      <hr className="border-gray-200 dark:border-gray-800 mb-4" />

      {/* Requirement + Timestamp/Members row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Requirement</p>
          <p className="text-sm font-semibold text-qx-text-primary">
            {minBal === 0n ? 'Open' : holderLabel}
          </p>
        </div>
        <div className="text-right">
          {lastMsg ? (
            <>
              <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Last message</p>
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qx-text-muted">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs text-qx-text-muted">{formatTimestamp(lastMsg.timestamp)}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Members</p>
              <p className="text-sm font-semibold text-qx-text-primary dark:text-gray-400">
                {pod.memberCount || 0}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

export default HomePage
