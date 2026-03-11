import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePods } from '@/hooks/usePods'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { usePodsStore } from '@/stores/pods'
import { PodChat } from '@/components/pods/PodChat'
import { InviteModal } from '@/components/pods/InviteModal'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import * as cc from '@/lib/contractCalls'
import { markPodAsRead, getUnreadCount } from '@/lib/unreadTracker'
import { sendNotification } from '@/lib/notifications'

import type { Pod, DefaultPod, PodMessage } from '@/types'

const formatHolderReq = (minBal: bigint): string => {
  const whole = minBal / (10n ** 18n)
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(0)}M+ Holders`
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K+ Holders`
  return `${whole}+ Holders`
}

const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const PodsPage: React.FC = () => {
  const { podId: podIdParam } = useParams<{ podId?: string }>()
  const navigate = useNavigate()
  const { address, balance, isConnected, evmAddress } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const addToast = useUIStore((s) => s.addToast)
  const [selectedPodId, setSelectedPodId] = useState<number | null>(
    podIdParam ? Number(podIdParam) : null
  )
  const [showInvite, setShowInvite] = useState(false)
  
  const {
    pods,
    myPods,
    defaultPods,
    podMessages,
    podMembers,
    isLoading,
    loadPodMessages,
    loadPodMembers,
    sendPodMessage,
    loadMyPods,
    leavePod,
  } = usePods()
  
  // Get message counts from store for unread indicator
  const podMessageCounts = usePodsStore((s) => s.podMessageCounts)
  const fetchPodMessageCount = usePodsStore((s) => s.fetchPodMessageCount)
  
  // Track previous message counts for notification detection
  const prevMessageCountsRef = useRef<Record<number, number>>({})

  // Access check state
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // Sync selectedPodId with URL param
  useEffect(() => {
    if (podIdParam) {
      setSelectedPodId(Number(podIdParam))
    }
  }, [podIdParam])

  // Check access when selectedPodId changes
  useEffect(() => {
    const verifyAccess = async () => {
      if (selectedPodId === null) {
        setHasAccess(null)
        return
      }
      
      // If pod is in accessiblePods, user has access
      const canAccess = myPods.some(p => p.id === selectedPodId)
      setHasAccess(canAccess)
      
      // If user doesn't have access, redirect to /pods list
      if (!canAccess) {
        navigate('/pods', { replace: true })
      }
    }
    
    verifyAccess()
  }, [selectedPodId, myPods, navigate])

  // Only show pods the user has access to (myPods is already filtered by checkAccess)
  // Also ensure pods have been loaded (myPods not empty after initial load)
  // Sort by latest message timestamp (descending) - newest activity first
  const accessiblePods: Pod[] = useMemo(() => {
    return [...myPods].sort((a, b) => {
      const msgsA = podMessages[a.id] || []
      const msgsB = podMessages[b.id] || []
      
      // Get timestamp of last message for each pod
      const lastTimeA = msgsA.length > 0 ? msgsA[msgsA.length - 1].timestamp : 0
      const lastTimeB = msgsB.length > 0 ? msgsB[msgsB.length - 1].timestamp : 0
      
      if (lastTimeA !== lastTimeB) {
        return lastTimeB - lastTimeA // Newest first
      }
      
      // Fallback: sort by message count (highest first as proxy for activity)
      const countA = podMessageCounts[a.id] || 0
      const countB = podMessageCounts[b.id] || 0
      return countB - countA
    })
  }, [myPods, podMessages, podMessageCounts])

  // Show loading or empty state while determining accessible pods
  const showPodsList = !isLoading && accessiblePods.length > 0

  // Get last message for each pod
  const getPodLastMessage = (podId: number): PodMessage | undefined => {
    const messages = podMessages[podId]
    if (!messages || messages.length === 0) return undefined
    return messages[messages.length - 1]
  }

  // Load messages and members when pod is selected
  useEffect(() => {
    if (selectedPodId !== null) {
      loadPodMessages(selectedPodId)
      loadPodMembers(selectedPodId)
    }
  }, [selectedPodId, loadPodMessages, loadPodMembers])

  // Poll for new messages when a pod is selected
  useEffect(() => {
    if (selectedPodId === null) return
    const interval = setInterval(() => {
      loadPodMessages(selectedPodId)
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedPodId, loadPodMessages])
  
  // Check for new messages and send notifications for non-active pods
  useEffect(() => {
    accessiblePods.forEach((pod) => {
      const currentCount = podMessageCounts[pod.id] || 0
      const prevCount = prevMessageCountsRef.current[pod.id] || 0
      
      // If new messages arrived and pod is not currently active
      if (currentCount > prevCount && selectedPodId !== pod.id && prevCount > 0) {
        // Get the latest message from podMessages for this pod
        const podMsgs = podMessages[pod.id] || []
        const latestMessage = podMsgs[podMsgs.length - 1]
        const messagePreview = latestMessage 
          ? latestMessage.content.substring(0, 50) + (latestMessage.content.length > 50 ? '...' : '')
          : 'New message'
        
        sendNotification(
          `New message in ${pod.name}`,
          messagePreview,
          `pod-${pod.id}`,
          () => {
            // Navigate to the pod when notification is clicked
            navigate(`/pods/${pod.id}`)
          }
        )
      }
      
      // Update the reference
      prevMessageCountsRef.current[pod.id] = currentCount
    })
  }, [podMessageCounts, accessiblePods, selectedPodId, navigate, podMessages])
  
  // Poll for message counts on all myPods to show unread indicators
  useEffect(() => {
    if (myPods.length === 0) return
    
    const fetchCounts = async () => {
      await Promise.all(
        myPods.map(pod => fetchPodMessageCount(pod.id))
      )
    }
    
    // Initial fetch
    fetchCounts()
    
    // Poll every 10 seconds
    const interval = setInterval(fetchCounts, 10000)
    return () => clearInterval(interval)
  }, [myPods, fetchPodMessageCount])
  
  // Fetch latest message for each pod on mount to populate sidebar previews
  useEffect(() => {
    if (accessiblePods.length === 0) return
    
    const fetchPreviews = async () => {
      // Fetch just the most recent message for each pod (limit=1)
      await Promise.all(
        accessiblePods.map(pod => loadPodMessages(pod.id))
      )
    }
    
    fetchPreviews()
  }, [accessiblePods.length]) // Only re-run when pod count changes

  // Ban detection is now handled instantly via ACCESS_DENIED error on message send
  // in usePods.ts sendPodMessage. No polling needed - reduces RPC load.

  const selectedPod = useMemo(() => {
    if (selectedPodId === null) return null
    return defaultPods.find((p) => p.id === selectedPodId) ||
           pods.find((p) => p.id === selectedPodId) ||
           myPods.find((p) => p.id === selectedPodId)
  }, [selectedPodId, defaultPods, pods, myPods])

  const currentMessages = useMemo(() => {
    return selectedPodId !== null ? (podMessages[selectedPodId] || []) : []
  }, [podMessages, selectedPodId])

  const currentMembers = useMemo(() => {
    return selectedPodId !== null ? (podMembers[selectedPodId] || []) : []
  }, [podMembers, selectedPodId])

  const handlePodSelect = (podId: number) => {
    // Mark pod as read before opening
    markPodAsRead(podId)
    
    setSelectedPodId(podId)
    // Update URL without full navigation
    navigate(`/pods/${podId}`, { replace: true })
  }

  const handleBack = () => {
    setSelectedPodId(null)
    navigate('/pods', { replace: true })
  }

  const handleLeave = async () => {
    if (selectedPodId === null) return
    
    try {
      await leavePod(selectedPodId)
      setSelectedPodId(null)
      navigate('/pods', { replace: true })
    } catch (err) {
      // Error already handled by the hook
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Your Pods</h2>
        <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to view your pods</p>
        <button
          onClick={() => setShowConnectWallet(true)}
          className="bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  // If a pod is selected, show the chat view full-width on mobile
  if (selectedPodId !== null && selectedPod) {
    const isCustom = 'creator' in selectedPod

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:static lg:z-auto lg:inset-auto lg:h-[calc(100vh-3.5rem)]">
        <PodChat
          pod={selectedPod}
          messages={currentMessages}
          members={currentMembers}
          currentUserAddress={address || ''}
          userBalance={balance}
          onSend={async (content) => {
            try {
              await sendPodMessage(selectedPodId, content)
              // Mark pod as read after sending (own messages never count as unread)
              markPodAsRead(selectedPodId)
            } catch (err) {
              // If access denied (banned), navigate back to pods list
              if (err instanceof Error && err.message === 'ACCESS_DENIED') {
                navigate('/pods', { replace: true })
              }
            }
          }}
          onBack={handleBack}
          onInvite={isCustom ? () => setShowInvite(true) : undefined}
          onLeave={isCustom ? handleLeave : undefined}
        />
        {isCustom && (
          <InviteModal
            isOpen={showInvite}
            onClose={() => setShowInvite(false)}
            podId={selectedPodId}
            podName={selectedPod.name}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Left column: Pod list */}
      <div className="flex h-full w-full md:w-72 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-qx-text-muted">Your Pods</p>
          <button
            onClick={() => navigate('/explore')}
            className="flex h-7 w-7 items-center justify-center text-qx-text-secondary hover:bg-qx-elevated hover:text-qx-text-primary transition-colors"
            title="Explore pods"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Pod List */}
        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : accessiblePods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-gray-400 dark:text-gray-400 text-sm">
                Tap <span className="text-[#0991B2] font-semibold">+</span> to explore and join a pod or create your own
              </p>
            </div>
          ) : (
            accessiblePods.map((pod) => {
              const isDefault = (pod as DefaultPod).isDefault === true
              const minBal = isDefault ? (pod as DefaultPod).minBalance : ((pod as any).minBalance || 0n)
              const holderReq = isDefault ? formatHolderReq(minBal) : 'Open'
              const lastMsg = getPodLastMessage(pod.id)
              const isActive = selectedPodId === pod.id
              
              // Calculate unread count (only messages from other users)
              const podMsgs = podMessages[pod.id] || []
              const unreadCount = getUnreadCount(pod.id, podMsgs)
              const hasUnread = unreadCount > 0 && !isActive
              
              // Better subtitle: use category for custom pods instead of just 'Open'
              const category = isDefault 
                ? 'Featured' 
                : ((pod as any).category || 'trading')
              const subtitle = isDefault ? holderReq : category.charAt(0).toUpperCase() + category.slice(1)

              return (
                <button
                  key={pod.id}
                  onClick={() => handlePodSelect(pod.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors border-b border-b-gray-200 dark:border-b-gray-800 border-l-2',
                    isActive
                      ? 'border-l-cyan-600 bg-gray-100 dark:bg-white/5'
                      : 'border-l-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold truncate text-qx-text-primary">
                      {pod.name}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Unread indicator */}
                      {hasUnread && (
                        unreadCount > 1 ? (
                          <span className="bg-cyan-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : (
                          <span className="h-2 w-2 bg-cyan-600 rounded-full"></span>
                        )
                      )}
                      {lastMsg && (
                        <span className="text-xs text-qx-text-muted">
                          {formatMessageTime(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs truncate text-qx-text-muted">
                    {lastMsg ? lastMsg.content : subtitle}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Center/Right: Empty state on desktop when no pod selected */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-white dark:bg-[#0D0D0D]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qx-elevated">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-qx-text-muted">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-qx-text-primary">Your Pods</h3>
          <p className="mt-1 text-sm text-qx-text-muted">Select a pod or explore to join one</p>
        </div>
      </div>
    </div>
  )
}

export default PodsPage
