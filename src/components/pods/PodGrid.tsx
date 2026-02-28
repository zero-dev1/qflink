import React, { useMemo } from 'react'
import { PodCard } from './PodCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Pod, CustomPod } from '@/types'

interface PodGridProps {
  pods: Pod[]
  myPodIds: number[]
  isLoading: boolean
  onJoin: (podId: number) => void
  onPodClick: (podId: number) => void
}

const TIER_ORDER: Record<string, number> = { elite: 3, premium: 2, standard: 1 }

function getTierRank(pod: Pod): number {
  if (pod.isDefault) return 4 // default pods first
  return TIER_ORDER[(pod as CustomPod).tier] || 0
}

function sortByTierThenMembers(a: Pod, b: Pod): number {
  const rankDiff = getTierRank(b) - getTierRank(a)
  if (rankDiff !== 0) return rankDiff
  return b.memberCount - a.memberCount
}

export const PodGrid: React.FC<PodGridProps> = ({ pods, myPodIds, isLoading, onJoin, onPodClick }) => {
  const sorted = useMemo(() => [...pods].sort(sortByTierThenMembers), [pods])
  const featuredPods = useMemo(() => sorted.filter((p) => p.isDefault || (!p.isDefault && (p as CustomPod).tier === 'elite')), [sorted])
  const otherPods = useMemo(() => sorted.filter((p) => !p.isDefault && (p as CustomPod).tier !== 'elite'), [sorted])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (pods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-qx-text-muted">No pods found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {featuredPods.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-400">
            <span>⭐</span> Featured
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPods.map((pod) => (
              <PodCard
                key={pod.id}
                pod={pod}
                isMember={myPodIds.includes(pod.id)}
                onJoin={onJoin}
                onClick={onPodClick}
              />
            ))}
          </div>
        </div>
      )}
      {otherPods.length > 0 && (
        <div>
          {featuredPods.length > 0 && (
            <h3 className="mb-3 text-sm font-semibold text-qx-text-secondary">All Pods</h3>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherPods.map((pod) => (
              <PodCard
                key={pod.id}
                pod={pod}
                isMember={myPodIds.includes(pod.id)}
                onJoin={onJoin}
                onClick={onPodClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
