import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePods } from '@/hooks/usePods'
import { Input } from '@/components/ui/Input'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { POD_CATEGORIES } from '@/types'
import type { Pod, DefaultPod, CustomPod } from '@/types'

const ExplorePage: React.FC = () => {
  console.log('🔍 [ExplorePage] Rendering...')
  
  const navigate = useNavigate()
  const { balance } = useWallet()
  const { pods, myPods, defaultPods, isLoading, loadPublicPods } = usePods()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  console.log('🔍 [ExplorePage] State:', { 
    podsCount: pods?.length, 
    myPodsCount: myPods?.length, 
    defaultPodsCount: defaultPods?.length,
    isLoading 
  })

  useEffect(() => {
    console.log('🔍 [ExplorePage] useEffect - calling loadPublicPods')
    loadPublicPods()
  }, [loadPublicPods])

  const myPodIds = useMemo(() => (myPods || []).map((p) => p.id), [myPods])

  const allPods: Pod[] = useMemo(() => {
    const combined = [...(defaultPods || []), ...(pods || [])]
    // Deduplicate by ID - safety net against any duplicate pods from store
    return combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
  }, [defaultPods, pods])

  const filtered = useMemo(() => {
    let result = allPods
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (category) {
      result = result.filter((p) => !p.isDefault && (p as CustomPod).category === category)
    }
    return result
  }, [allPods, search, category])

  const filteredDefaults = filtered.filter((p) => p.isDefault)
  const customPods = filtered.filter((p) => !p.isDefault)

  const formatBal = (b: bigint) => {
    const whole = b / (10n ** 18n)
    if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(1)}M`
    if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K`
    return whole.toString()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-qf-text-primary">Explore Pods</h1>
          <p className="text-sm text-qf-text-secondary mt-1">
            Discover gated communities based on your QF holdings
          </p>
        </div>
        <button
          onClick={() => navigate('/create-pod')}
          className="flex flex-shrink-0 items-center gap-2 bg-qf-accent px-4 py-2 text-sm font-semibold text-black hover:bg-qf-accent-hover transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Pod
        </button>
      </div>

      {/* Search bar with icon */}
      <div className="relative">
        <svg
          width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-qf-text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search pods by name, token, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border border-qf-border-prominent bg-qf-card pl-10 pr-4 text-sm text-qf-text-primary placeholder:text-qf-text-muted focus:border-qf-accent focus:outline-none focus:ring-1 focus:ring-qf-accent transition-colors"
        />
      </div>

      <CategoryPills
        categories={POD_CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-qf-card-border bg-qf-card p-12 text-center">
          <p className="text-sm text-qf-text-muted">No pods found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDefaults.map((pod) => (
            <ExplorePodCard
              key={pod.id}
              pod={pod}
              isMember={myPodIds.includes(pod.id)}
              userBalance={balance}
              formatBal={formatBal}
              onView={() => navigate(`/pod/${pod.id}`)}
            />
          ))}
          {customPods.map((pod) => (
            <ExplorePodCard
              key={pod.id}
              pod={pod}
              isMember={myPodIds.includes(pod.id)}
              userBalance={balance}
              formatBal={formatBal}
              onView={() => navigate(`/pod/${pod.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ExplorePodCardProps {
  pod: Pod
  isMember: boolean
  userBalance: bigint
  formatBal: (b: bigint) => string
  onView: () => void
}

const ExplorePodCard: React.FC<ExplorePodCardProps> = ({
  pod,
  isMember,
  userBalance,
  formatBal,
  onView,
}) => {
  const isDefault = pod.isDefault
  const description = isDefault
    ? (pod as DefaultPod).description
    : (pod as CustomPod).description
  const minBal = isDefault
    ? (pod as DefaultPod).minBalance
    : ((pod as CustomPod).minBalance || 0n)
  const canJoin = userBalance >= minBal

  return (
    <div className="flex flex-col bg-qf-card border border-qf-card-border p-5 transition-[border-color,transform] duration-150 hover:border-qf-accent hover:-translate-y-0.5">
      {/* Featured label — plain text, no pill */}
      {isDefault && (
        <p className="text-xs text-qf-text-secondary mb-2">Featured</p>
      )}

      {/* Pod name */}
      <h3 className="text-xl font-bold text-qf-text-primary mb-1">{pod.name}</h3>

      {/* Description */}
      <p className="text-sm text-qf-text-secondary mb-4 line-clamp-2 flex-1">{description}</p>

      {/* Divider */}
      <hr className="border-qf-card-border mb-4" />

      {/* Requirement + Members row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-qf-text-muted mb-0.5">Requirement</p>
          <p className="text-sm font-semibold text-qf-text-primary">{formatBal(minBal)}+ QF Holders</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-qf-text-muted mb-0.5">Members</p>
          <p className="text-sm font-semibold text-qf-text-primary">Open</p>
        </div>
      </div>

      {/* CTA button */}
      {isMember ? (
        <button
          onClick={onView}
          className="w-full rounded-sm bg-qf-accent py-2.5 text-sm font-semibold text-black hover:bg-qf-accent-hover transition-colors"
        >
          View Pod
        </button>
      ) : (
        <div className="text-center py-2.5 text-xs text-qf-text-muted">
          You need {formatBal(minBal)}+ QF to access this pod
        </div>
      )}
    </div>
  )
}

export default ExplorePage
