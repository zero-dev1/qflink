import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatBalance } from '@/lib/utils'
import type { Pod, CustomPod, DefaultPod } from '@/types'

interface PodCardProps {
  pod: Pod
  isMember: boolean
  unreadCount?: number
  onJoin: (podId: number) => void
  onClick: (podId: number) => void
}

const TierBadge: React.FC<{ tier?: string }> = ({ tier }) => {
  if (tier === 'elite') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-400">
        ✓ Verified
      </span>
    )
  }
  if (tier === 'premium') {
    return (
      <span className="inline-flex items-center rounded-full bg-cyan-600/15 px-2 py-0.5 text-xs font-semibold text-cyan-600">
        Premium
      </span>
    )
  }
  return null
}

export const PodCard: React.FC<PodCardProps> = ({ pod, isMember, unreadCount = 0, onJoin, onClick }) => {
  const tier = pod.isDefault ? undefined : (pod as CustomPod).tier
  const minBal = pod.isDefault ? (pod as DefaultPod).minBalance : ((pod as CustomPod).minBalance || 0n)
  const isComingSoon = pod.isDefault && minBal === 0n

  return (
    <div
      onClick={isComingSoon ? undefined : () => onClick(pod.id)}
      className={`
        flex flex-col border border-gray-200 dark:border-gray-800 bg-transparent p-4
        ${isComingSoon 
          ? 'opacity-70 cursor-not-allowed' 
          : 'transition-[border-color,transform] duration-150 cursor-pointer hover:border-cyan-600 hover:-translate-y-0.5'}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={isComingSoon ? 'text-lg font-semibold text-gray-500 truncate' : 'text-lg font-semibold text-qx-text-primary truncate'}>
            {pod.name}
          </h3>
          {unreadCount > 0 && !isComingSoon && (
            <span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {isComingSoon ? (
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Coming Soon</span>
        ) : pod.isDefault ? (
          <Badge className="bg-cyan-600/15 text-cyan-600 border-0">Featured</Badge>
        ) : (
          <TierBadge tier={tier} />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-qx-text-secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>{isComingSoon ? 'Coming Soon' : (pod.isDefault ? 'Open to all' : `${pod.memberCount} members`)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-qx-text-secondary">
        <span>🔒</span>
        <span>{isComingSoon ? 'Deploy a contract on QF Network' : `${formatBalance(minBal)} QF minimum`}</span>
      </div>

      <div className="mt-4">
        {isComingSoon ? (
          <button
            disabled
            className="w-full rounded-sm bg-transparent border border-gray-700 text-gray-500 py-2.5 text-sm font-semibold cursor-not-allowed"
          >
            Coming Soon
          </button>
        ) : isMember ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-qx-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Joined
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onJoin(pod.id)
            }}
            className="w-full rounded-sm bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
          >
            Join Pod
          </button>
        )}
      </div>
    </div>
  )
}
