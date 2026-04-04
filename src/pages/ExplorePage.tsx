import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePods } from '@/hooks/usePods'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/ui'

import { POD_CATEGORIES } from '@/types'
import type { Pod, DefaultPod, CustomPod } from '@/types'
import { cn, formatCompactBalance, formatExactAmount } from '@/lib/utils'
import { TokenGateBar } from '@/components/pods/TokenGateBar'
import * as cc from '@/lib/contractCalls'
import { useWalletStore } from '@/stores/wallet'
import { usePodsStore } from '@/stores/pods'

const ExplorePage: React.FC = () => {
  const navigate = useNavigate()
  const { balance, address } = useWallet()
  const refreshBalance = useWalletStore((s) => s.refreshBalance)
  const addToast = useUIStore((s) => s.addToast)
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
  const [paidPodHasPaid, setPaidPodHasPaid] = useState(false)
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

  const formatBal = (b: bigint) => formatCompactBalance(b)
  const formatExact = (b: bigint) => formatExactAmount(b)  // Use for entry fees to show exact amount

  // Handle pod selection - show modal for paid pods, navigate directly for free pods
  const handlePodSelect = async (pod: Pod, options?: { isRejoin?: boolean }) => {
    const entryFee = !pod.isDefault ? ((pod as CustomPod).entryFee || 0n) : 0n
    const evmAddress = useWalletStore.getState().evmAddress

    // Creator always goes straight to chat, never sees the modal
    if (!pod.isDefault && (pod as CustomPod).creator?.toLowerCase() === evmAddress?.toLowerCase()) {
      navigate(`/pods/${pod.id}`)
      return
    }

    // If pod has entry fee and user is NOT a member, check if they need to pay
    if (entryFee > 0n && evmAddress && !myPodIds.includes(pod.id)) {
      const hasPaid = await cc.hasPaid(pod.id, evmAddress as `0x${string}`)
      if (hasPaid) {
        // User already paid but left - rejoin without paying again
        setIsJoining(true)
        try {
          const isBanned = await cc.isBanned(pod.id, evmAddress as `0x${string}`)
          if (isBanned) {
            addToast('error', 'You are banned from this pod')
            setIsJoining(false)
            return
          }
          // Rejoin with 0 value since they already paid
          const joinTxResult = await cc.joinPod(pod.id, 0n)
          await joinTxResult.confirmation
          await new Promise(r => setTimeout(r, 1000))
          await usePodsStore.getState().fetchPods()
          await refreshBalance()
          navigate(`/pods/${pod.id}`)
        } catch (err) {
          console.error('Failed to rejoin pod:', err)
          addToast('error', err instanceof Error ? err.message : 'Failed to rejoin pod')
          setIsJoining(false)
        }
        return
      } else {
        // User hasn't paid, show modal
        setPaidPodHasPaid(false)
        setPaidPodModalPod(pod)
        return
      }
    }

    // Free pod (default or custom) - join on-chain first so user_pods reverse index is updated
    if (!myPodIds.includes(pod.id) && address) {
      setIsJoining(true)
      try {
        const evmAddress = useWalletStore.getState().evmAddress
        if (evmAddress) {
          const isBanned = await cc.isBanned(pod.id, evmAddress as `0x${string}`)
          if (isBanned) {
            addToast('error', 'You are banned from this pod')
            setIsJoining(false)
            return
          }
        }
        const joinReceipt = await cc.joinPod(pod.id, 0n)
        await joinReceipt.confirmation
        await new Promise(r => setTimeout(r, 1000))
        await usePodsStore.getState().fetchPods()
        await refreshBalance()
        navigate(`/pods/${pod.id}`)
        return
      } catch (err) {
        console.error('Failed to join free pod:', err)
        addToast('error', err instanceof Error ? err.message : 'Failed to join pod')
        setIsJoining(false)
        return
      }
    }
    // Already a member - navigate to chat
    navigate(`/pods/${pod.id}`)
  }

  // Handle joining a paid pod (new user - needs to pay)
  const handleJoinPaidPod = async () => {
    if (!paidPodModalPod) return
    
    setIsJoining(true)
    try {
      const entryFee = ((paidPodModalPod as CustomPod).entryFee || 0n)
      const fetchPods = usePodsStore.getState().fetchPods
      
      if (!address) {
        throw new Error('Wallet not connected')
      }
      
      // Check ban status before joining
      const evmAddress = useWalletStore.getState().evmAddress
      if (evmAddress) {
        const isBanned = await cc.isBanned(paidPodModalPod.id, evmAddress as `0x${string}`)
        if (isBanned) {
          addToast('error', 'You are banned from this pod')
          setIsJoining(false)
          setPaidPodModalPod(null)
          return
        }
      }
      
      const joinTxResult = await cc.joinPod(paidPodModalPod.id, entryFee)
      // Refresh pods to update sidebar immediately (myPods now comes from on-chain check)
      await joinTxResult.confirmation
      // BUG 4 FIX: Add delay before fetching to ensure contract state is updated
      await new Promise(r => setTimeout(r, 1000))
      await fetchPods()
      await refreshBalance()
      
      navigate(`/pods/${paidPodModalPod.id}`)
    } catch (err) {
      console.error('❌ Failed to join pod:', err)
      addToast('error', err instanceof Error ? err.message : 'Failed to join pod')
    } finally {
      setIsJoining(false)
      setPaidPodModalPod(null)
      setPaidPodHasPaid(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4" id="explore-pods">
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
        <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-12 text-center min-h-[240px] flex items-center justify-center">
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
          onCancel={() => { setPaidPodModalPod(null); setPaidPodHasPaid(false) }}
          isJoining={isJoining}
          formatBal={formatBal}
          formatExact={formatExact}
          hasPaid={paidPodHasPaid}
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
  const category = isDefault
    ? 'trading'
    : ((pod as CustomPod).category || 'trading')
  const minBal = isDefault
    ? (pod as DefaultPod).minBalance
    : ((pod as CustomPod).minBalance || 0n)
  const entryFee = isDefault ? 0n : ((pod as CustomPod).entryFee || 0n)
  const hasEntryFee = entryFee > 0n
  const meetsBalanceThreshold = userBalance >= minBal
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
        const paid = await cc.hasPaid(pod.id, evmAddress as `0x${string}`)
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
    <div className="flex flex-col bg-transparent border border-gray-200 dark:border-gray-800 p-5 transition-[border-color,transform] duration-150 hover:border-cyan-600 hover:-translate-y-0.5">
      {/* Badge label for Featured (top-left) */}
      {isDefault && !hasEntryFee && (
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

      {/* Requirement + Members row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Requirement</p>
          <p className="text-sm font-semibold text-qx-text-primary">
            {minBal === 0n ? 'Open' : `${formatBal(minBal)} QF`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-qx-text-muted dark:text-gray-400 mb-0.5">Members</p>
          <p className="text-sm font-semibold text-qx-text-primary dark:text-gray-400">
            {pod.memberCount || 0}
          </p>
        </div>
      </div>

      {/* CTA button - 5 states */}
      {isCreator || isMember ? (
        // STATE 1: View Pod (creator OR current member)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          View Pod
        </button>
      ) : !meetsBalanceThreshold ? (
        // STATE 5: You need X QF (doesn't meet balance threshold)
        <button
          disabled
          className="w-full bg-transparent border border-gray-600 text-gray-500 py-2.5 text-sm font-semibold cursor-not-allowed"
        >
          You need {minBal === 0n ? 'tokens' : `${formatBal(minBal)} QF`}
        </button>
      ) : hasEntryFee && hasPaid === true ? (
        // STATE 2: Rejoin Pod (paid but left - no payment needed)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          Rejoin Pod
        </button>
      ) : hasEntryFee && hasPaid === false ? (
        // STATE 3: Join · X QF (new user, needs to pay)
        <button
          onClick={onView}
          className="w-full bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
        >
          Join · {formatBal(entryFee)} QF
        </button>
      ) : (
        // STATE 4: Join Pod (free pod, no entry fee)
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
  formatExact: (b: bigint) => string
  hasPaid: boolean
}> = ({ pod, onJoin, onCancel, isJoining, formatBal, formatExact, hasPaid }) => {
  const { balance } = useWallet()
  const [freshEntryFee, setFreshEntryFee] = React.useState<bigint | null>(null)
  
  // Fetch fresh entry fee when modal opens to avoid stale cached data
  React.useEffect(() => {
    let cancelled = false
    const fetchFee = async () => {
      const fee = await cc.getEntryFee(pod.id)
      if (!cancelled) setFreshEntryFee(fee)
    }
    fetchFee()
    return () => { cancelled = true }
  }, [pod.id])
  
  // Use fresh fee if available, fallback to cached pod data
  const entryFee = freshEntryFee ?? ((pod as CustomPod).entryFee || 0n)
  const hasInsufficientBalance = !hasPaid && balance < entryFee
  
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
          {hasPaid ? (
            <p className="text-green-400 font-bold text-lg">Already Paid ✓</p>
          ) : (
            <p className="text-white font-bold text-lg">{formatExact(entryFee)} QF</p>
          )}
        </div>
        
        {/* Fee breakdown */}
        {!hasPaid && (
          <p className="text-gray-500 text-sm mb-4">
            95% to creator · 5% to treasury
          </p>
        )}
        
        {/* Your Balance */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            Your Balance: <span className="text-white font-medium">{formatExact(balance)} QF</span>
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
            {isJoining ? 'Joining...' : hasPaid ? 'Rejoin Pod' : `Join & Pay ${formatExact(entryFee)} QF`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExplorePage
