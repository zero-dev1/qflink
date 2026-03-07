import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePods } from '@/hooks/usePods'
import { useWallet } from '@/hooks/useWallet'
import { usePodsStore } from '@/stores/pods'
import { PodChat } from '@/components/pods/PodChat'
import { InviteModal } from '@/components/pods/InviteModal'
import { Spinner } from '@/components/ui/Spinner'
import * as cc from '@/lib/contractCalls'

const PodPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { address, balance, evmAddress } = useWallet()
  const {
    pods,
    myPods,
    podMessages,
    podMembers,
    isLoading,
    loadPodMessages,
    loadPodMembers,
    sendPodMessage,
  } = usePods()

  const defaultPods = usePodsStore((s) => s.defaultPods)
  const podId = Number(id)

  const [isBanned, setIsBanned] = useState<boolean | null>(null)
  const [checkingBanStatus, setCheckingBanStatus] = useState(false)

  // Check ban status when pod loads
  useEffect(() => {
    if (isNaN(podId) || !evmAddress) return
    
    const checkBanStatus = async () => {
      setCheckingBanStatus(true)
      try {
        const banned = await cc.isBanned(podId, evmAddress as `0x${string}`)
        setIsBanned(banned)
      } catch (err) {
        console.error('Failed to check ban status:', err)
        setIsBanned(false)
      } finally {
        setCheckingBanStatus(false)
      }
    }
    
    checkBanStatus()
  }, [podId, evmAddress])

  useEffect(() => {
    if (!isNaN(podId)) {
      loadPodMessages(podId)
      loadPodMembers(podId)
    }
  }, [podId, loadPodMessages, loadPodMembers])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (isNaN(podId)) return
    const interval = setInterval(() => {
      loadPodMessages(podId)
    }, 5000)
    return () => clearInterval(interval)
  }, [podId, loadPodMessages])

  const pod =
    defaultPods.find((p) => p.id === podId) ||
    pods.find((p) => p.id === podId) ||
    myPods.find((p) => p.id === podId)
  const messages = podMessages[podId] || []
  const members = podMembers[podId] || []

  const [showInvite, setShowInvite] = useState(false)
  const [podLoadAttempts, setPodLoadAttempts] = useState(0)

  // Retry loading pod data if not found (for newly created pods)
  useEffect(() => {
    if (!pod && !isLoading && podLoadAttempts < 3) {
      const timer = setTimeout(() => {
        setPodLoadAttempts((prev) => prev + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pod, isLoading, podLoadAttempts])

  if (isLoading || !pod || checkingBanStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">
          {podLoadAttempts > 0 ? 'Loading pod data...' : 'Checking authentication...'}
        </p>
      </div>
    )
  }

  if (!address) {
    navigate('/')
    return null
  }

  // Show banned message if user is banned
  if (isBanned) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:static lg:z-auto lg:inset-auto lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-qx-text-primary mb-2">Access Denied</h2>
            <p className="text-qx-text-secondary">You have been banned from this pod.</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isCustom = 'creator' in pod

  const handleLeave = async () => {
    // leavePod will be wired when contracts are ready
    navigate(-1)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:static lg:z-auto lg:inset-auto lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      <PodChat
        pod={pod}
        messages={messages}
        members={members}
        currentUserAddress={evmAddress || address}
        userBalance={balance}
        onSend={async (content) => {
          try {
            await sendPodMessage(podId, content)
          } catch (err) {
            // If access denied, navigate away from pod
            if (err instanceof Error && err.message === 'ACCESS_DENIED') {
              navigate('/pods')
            }
          }
        }}
        onBack={() => navigate(-1)}
        onInvite={isCustom ? () => setShowInvite(true) : undefined}
        onLeave={isCustom ? handleLeave : undefined}
        onRefreshMembers={() => loadPodMembers(podId)}
      />
      {isCustom && (
        <InviteModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          podId={podId}
          podName={pod.name}
        />
      )}
    </div>
  )
}

export default PodPage
