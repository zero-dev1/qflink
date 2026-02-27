import React, { useState, useEffect } from 'react'
import { PodGrid } from '@/components/pods/PodGrid'
import { PodChat } from '@/components/pods/PodChat'
import { CreatePodModal } from '@/components/pods/CreatePodModal'
import { Button } from '@/components/ui/Button'
import { usePods } from '@/hooks/usePods'
import { useWallet } from '@/hooks/useWallet'

const PodsPage: React.FC = () => {
  const { address, balance } = useWallet()
  const {
    pods,
    myPods,
    activePod,
    podMessages,
    podMembers,
    isLoading,
    setActivePod,
    loadPublicPods,
    loadMyPods,
    createPod,
    joinPod,
    sendPodMessage,
    loadPodMessages,
    loadPodMembers,
  } = usePods()

  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadPublicPods()
    loadMyPods()
  }, [loadPublicPods, loadMyPods])

  useEffect(() => {
    if (activePod !== null) {
      loadPodMessages(activePod)
      loadPodMembers(activePod)
    }
  }, [activePod, loadPodMessages, loadPodMembers])

  const activePodData = pods.find((p) => p.id === activePod) || myPods.find((p) => p.id === activePod)
  const myPodIds = myPods.map((p) => p.id)

  if (activePod !== null && activePodData && address) {
    return (
      <div className="h-screen">
        <PodChat
          pod={activePodData}
          messages={podMessages[activePod] || []}
          members={podMembers[activePod] || []}
          currentUserAddress={address}
          userBalance={balance}
          onSend={(content) => sendPodMessage(activePod, content)}
          onBack={() => setActivePod(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-qf-text-primary">Whale Pods</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          Create Pod
        </Button>
      </div>

      <div className="mb-6 flex gap-1 bg-qf-elevated p-1">
        <button
          onClick={() => setTab('discover')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'discover' ? 'bg-qf-card text-qf-text-primary' : 'text-qf-text-muted hover:text-qf-text-primary'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setTab('my')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'my' ? 'bg-qf-card text-qf-text-primary' : 'text-qf-text-muted hover:text-qf-text-primary'
          }`}
        >
          My Pods
        </button>
      </div>

      <PodGrid
        pods={tab === 'discover' ? pods : myPods}
        myPodIds={myPodIds}
        isLoading={isLoading}
        onJoin={joinPod}
        onPodClick={setActivePod}
      />

      <CreatePodModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (name, description, minBalance, isPublic, tier) => { await createPod(name, description, minBalance, isPublic, tier) }}
        userBalance={balance}
      />
    </div>
  )
}

export default PodsPage
