import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePods } from '@/hooks/usePods'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { POD_CATEGORIES } from '@/types'
import type { Pod, DefaultPod, CustomPod } from '@/types'
import { cn } from '@/lib/utils'
import { joinPodOnChain, podsHasPaid } from '@/lib/contracts'
import { useWalletStore } from '@/stores/wallet'
import { usePodsStore } from '@/stores/pods'

const ExplorePage: React.FC = () => {
  const navigate = useNavigate()
  const { balance, address } = useWallet()
  const { 
    pods, 
    myPods, 
    defaultPods, 
    isLoading, 
    loadPublicPods,
  } = usePods()
  
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [paidPodModalPod, setPaidPodModalPod] = useState<Pod | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    loadPublicPods()
  }, [loadPublicPods])

  const myPodIds = useMemo(() => (myPods || []).map((p) => p.id), [myPods])

  const filteredExplorePods = useMemo(() => {
    let allPods = [...(defaultPods || []), ...(pods || [])]
    // Deduplicate
    allPods = allPods.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    
    if (search) {
      const q = search.toLowerCase()
      allPods = allPods.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (category) {
      allPods = allPods.filter((p) => !p.isDefault && (p as CustomPod).category === category)
    }
    return allPods
  }, [defaultPods, pods, search, category])

  const formatBal = (b: bigint) => {
    const whole = b / (10n ** 18n)
    if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(0)}M`
    if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K`
    return whole.toLocaleString()
  }

  // Handle pod selection - show modal for paid pods, navigate directly for free pods
  const handlePodSelect = async (pod: Pod) => {
    const entryFee = !pod.isDefault ? ((pod as CustomPod).entryFee || 0n) : 0n
    const evmAddress = useWalletStore.getState().evmAddress
    const joinPod = usePodsStore.getState().joinPod

    // Creator always goes straight to chat, never sees the modal
    if (!pod.isDefault && (pod as CustomPod).creator?.toLowerCase() === evmAddress?.toLowerCase()) {
      navigate(`/pods/${pod.id}`)
      return
    }

    // If pod has entry fee, check if user has already paid
    if (entryFee > 0n && evmAddress) {
      const hasPaid = await podsHasPaid(pod.id, evmAddress)
      if (hasPaid) {
        // User already paid, navigate directly
        navigate(`/pods/${pod.id}`)
      } else {
        // User hasn't paid, show modal
        setPaidPodModalPod(pod)
      }
    } else {
      // Free pod - record join in store BEFORE navigating
      joinPod(pod.id)
      navigate(`/pods/${pod.id}`)
    }
  }

  // Handle joining a paid pod
  const handleJoinPaidPod = async () => {
    if (!paidPodModalPod) return
    
    setIsJoining(true)
    try {
      const entryFee = ((paidPodModalPod as CustomPod).entryFee || 0n)
      const joinPod = usePodsStore.getState().joinPod
      const fetchPods = usePodsStore.getState().fetchPods
      
      if (!address) {
        throw new Error('Wallet not connected')
      }
      
      await joinPodOnChain(paidPodModalPod.id, address, entryFee)
      
      // Record join after successful payment
      joinPod(paidPodModalPod.id)
      
      // Refresh pods to update sidebar immediately
      await fetchPods()
      
      navigate(`/pods/${paidPodModalPod.id}`)
    } catch (err) {
      console.error('❌ Failed to join pod:', err)
      alert(`Failed to join pod: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsJoining(false)
      setPaidPodModalPod(null)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-qx-text-primary">Explore Pods</h1>
          <p className="text-sm text-qx-text-secondary mt-1">
            Discover gated communities based on your QF holdings
          </p>
        </div>
        <button
          onClick={() => navigate('/create-pod')}
          className="flex flex-shrink-0 items-center gap-2 bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-qx-text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search pods by name, token, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-white/5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 transition-colors"
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
      ) : filteredExplorePods.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-12 text-center">
          <p className="text-sm text-qx-text-muted">No pods found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExplorePods.map((pod) => (
            <ExplorePodCard
              key={pod.id}
              pod={pod}
              isMember={myPodIds.includes(pod.id)}
              userBalance={balance}
              formatBal={formatBal}
              onView={() => handlePodSelect(pod)}
            />
          ))}
        </div>
      )}
      
      {/* Paid Pod Modal */}
      {paidPodModalPod && (
        <PaidPodModal
          pod={paidPodModalPod}
          onJoin={handleJoinPaidPod}
          onCancel={() => setPaidPodModalPod(null)}
          isJoining={isJoining}
          formatBal={formatBal}
        />
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
  const [hasPaid, setHasPaid] = React.useState<boolean | null>(null)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  
  const isDefault = pod.isDefault
  const description = isDefault
    ? (pod as DefaultPod).description
    : (pod as CustomPod).description
  const minBal = isDefault
    ? (pod as DefaultPod).minBalance
    : ((pod as CustomPod).minBalance || 0n)
  const entryFee = isDefault ? 0n : ((pod as CustomPod).entryFee || 0n)
  const hasEntryFee = entryFee > 0n
  const meetsBalanceThreshold = userBalance >= minBal
  const isComingSoon = isDefault && minBal === 0n
  const isCreator = !isDefault && evmAddress && (pod as CustomPod).creator?.toLowerCase() === evmAddress.toLowerCase()
  
  // Check if user has paid for this pod
  const isCheckingPayment = React.useRef(false)
  React.useEffect(() => {
    if (!hasEntryFee || !evmAddress) {
      setHasPaid(null)
      return
    }
    if (isCheckingPayment.current) return
    let cancelled = false
    const checkPayment = async () => {
      isCheckingPayment.current = true
      try {
        const paid = await podsHasPaid(pod.id, evmAddress)
        if (!cancelled) setHasPaid(paid)
      } catch {
        // ignore
      } finally {
        isCheckingPayment.current = false
      }
    }
    checkPayment()
    return () => { cancelled = true }
  }, [pod.id, hasEntryFee, evmAddress])

  return (
    <div className={cn(
      "flex flex-col bg-transparent border border-gray-200 dark:border-gray-800 p-5",
      !isComingSoon && "transition-[border-color,transform] duration-150 hover:border-cyan-600 hover:-translate-y-0.5"
    )}>
      {/* Badge label for Coming Soon and Featured (top-left) */}
      {isComingSoon ? (
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Coming Soon</p>
      ) : isDefault && !hasEntryFee && (
        <p className="text-xs text-qx-text-secondary dark:text-gray-400 mb-2">Featured</p>
      )}

      {/* Pod name with PAID badge on same line */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-bold text-qx-text-primary">{pod.name}</h3>
        {/* PAID badge (right side, aligned with title) */}
        {hasEntryFee && (
          <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold ml-2">
            PAID
          </p>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-qx-text-secondary mb-4 line-clamp-2 flex-1">{description}</p>

      {/* Divider */}
      <hr className="border-gray-200 dark:border-gray-800 mb-4" />

      {/* Requirement + Members row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Requirement</p>
          <p className={cn(
            "text-sm font-semibold",
            isComingSoon ? "text-gray-500" : "text-qx-text-primary"
          )}>
            {isComingSoon ? "Deploy a contract on QF Network" : `${formatBal(minBal)}+ QF`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Members</p>
          <p className={cn(
            "text-sm font-semibold",
            isComingSoon ? "text-gray-500" : "text-qx-text-primary dark:text-gray-400"
          )}>
            {isComingSoon ? "Coming Soon" : "Open"}
          </p>
        </div>
      </div>

      {/* CTA button - 5 states */}
      {isComingSoon ? (
        // STATE 5: Coming Soon (default pod with non-balance gate)
        <button
          disabled
          className="w-full bg-transparent border border-gray-600 text-gray-500 py-2.5 text-sm font-semibold cursor-not-allowed"
        >
          Coming Soon
        </button>
      ) : isCreator || (hasEntryFee && hasPaid === true) || (isMember && !hasEntryFee) ? (
        // STATE 1: View Pod (creator OR already paid OR already member of free pod)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          View Pod
        </button>
      ) : !meetsBalanceThreshold ? (
        // STATE 4: You need X QF (doesn't meet balance threshold)
        <button
          disabled
          className="w-full bg-transparent border border-gray-600 text-gray-500 py-2.5 text-sm font-semibold cursor-not-allowed"
        >
          You need {formatBal(minBal)}+ QF
        </button>
      ) : hasEntryFee && hasPaid === false ? (
        // STATE 3: Join · X QF (meets threshold, has entry fee, hasn't paid)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          Join · {formatBal(entryFee)} QF
        </button>
      ) : (
        // STATE 2: Join Pod (meets threshold, no entry fee, not yet member)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          Join Pod
        </button>
      )}
    </div>
  )
}

// Modal for paid pod confirmation
const PaidPodModal: React.FC<{
  pod: Pod
  onJoin: () => void
  onCancel: () => void
  isJoining: boolean
  formatBal: (b: bigint) => string
}> = ({ pod, onJoin, onCancel, isJoining, formatBal }) => {
  const { balance } = useWallet()
  const entryFee = ((pod as CustomPod).entryFee || 0n)
  const hasInsufficientBalance = balance < entryFee
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="mx-4 w-full max-w-md bg-[#0D0D0D] border border-gray-700 p-6 shadow-xl">
        {/* Pod name */}
        <h2 className="text-xl font-bold text-white mb-2">{pod.name}</h2>
        
        {/* Pod description */}
        <p className="text-gray-400 text-sm mb-4">{pod.description}</p>
        
        {/* Divider */}
        <hr className="border-gray-700 mb-4" />
        
        {/* Entry Fee */}
        <div className="mb-2">
          <p className="text-gray-400 text-sm mb-1">Entry Fee</p>
          <p className="text-white font-bold text-lg">{formatBal(entryFee)} QF</p>
        </div>
        
        {/* Fee breakdown */}
        <p className="text-gray-500 text-sm mb-4">
          95% to creator · 5% to treasury
        </p>
        
        {/* Your Balance */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            Your Balance: <span className="text-white font-medium">{formatBal(balance)} QF</span>
          </p>
        </div>
        
        {/* Insufficient balance warning */}
        {hasInsufficientBalance && (
          <p className="text-red-400 text-sm mb-4">Insufficient balance</p>
        )}
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isJoining}
            className="flex-1 bg-transparent border border-gray-600 text-white py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            disabled={isJoining || hasInsufficientBalance}
            className="flex-1 bg-cyan-600 text-white py-2.5 text-sm font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : `Join & Pay ${formatBal(entryFee)} QF`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExplorePage
