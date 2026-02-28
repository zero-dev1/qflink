import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePods } from '@/hooks/usePods'
import { useWallet } from '@/hooks/useWallet'
import { usePodsStore } from '@/stores/pods'
import { PodChat } from '@/components/pods/PodChat'
import { InviteModal } from '@/components/pods/InviteModal'
import { Spinner } from '@/components/ui/Spinner'

const PodPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { address, balance } = useWallet()
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

  if (isLoading || !pod) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!address) {
    navigate('/')
    return null
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
        currentUserAddress={address}
        userBalance={balance}
        onSend={(content) => sendPodMessage(podId, content)}
        onBack={() => navigate(-1)}
        onInvite={isCustom ? () => setShowInvite(true) : undefined}
        onLeave={isCustom ? handleLeave : undefined}
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
