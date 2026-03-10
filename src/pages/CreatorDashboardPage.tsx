import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePodsStore } from '@/stores/pods'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { cn, formatExactAmount, formatCompactBalance } from '@/lib/utils'
import * as cc from '@/lib/contractCalls'
import { resolveQFName } from '@/lib/qns'
import type { CustomPod } from '@/types'

type DashboardView = 'overview' | 'pods' | 'revenue' | 'settings' | `pod-${number}`

const CREATOR_FEE_PCT = 95n
// memberCount from contract is accurate (creator counted once)
function getAdjustedMemberCount(pod: CustomPod): number {
  return pod.memberCount || 0
}

function calcPodRevenue(pod: CustomPod): bigint {
  const fee = pod.entryFee ?? 0n
  if (fee === 0n) return 0n
  // Subtract 1 for creator (who doesn't pay entry fee)
  const payingMembers = BigInt(Math.max(0, (pod.memberCount || 0) - 1))
  return payingMembers * fee * CREATOR_FEE_PCT / 100n
}

function formatQF(wei: bigint): string {
  return formatExactAmount(wei)
}

function parseQFToWei(value: string): bigint {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '0') return 0n
  if (Number(trimmed) < 0) return 0n
  const parts = trimmed.split('.')
  const wholePart = parts[0] || '0'
  const fracPart = (parts[1] || '').padEnd(18, '0').slice(0, 18)
  return BigInt(wholePart) * 10n ** 18n + BigInt(fracPart)
}

// ── Sidebar nav items ─────────────────────────────────────────
const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'pods',
    label: 'My Pods',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 9 19.4" />
      </svg>
    ),
  },
]

// ── Category badge colors ─────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  trading: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  tokens: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  nfts: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
  defi: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  gaming: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  builders: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  social: 'bg-[#0991B2]/15 text-[#0991B2] dark:text-[#0AA1C2] border-[#0991B2]/30',
  alpha: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
}

// ── Skeleton pulse ────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-800 rounded', className)} />
)

// ── Stat Card ─────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string
  value: string
  accent?: boolean
  icon: React.ReactNode
  loading?: boolean
}> = ({ label, value, accent, icon, loading }) => (
  <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-5 transition-colors hover:border-gray-300 dark:hover:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</span>
      <span className="text-gray-400 dark:text-gray-600">{icon}</span>
    </div>
    {loading ? (
      <Skeleton className="h-8 w-24" />
    ) : (
      <p className={cn('text-2xl font-bold', accent ? 'text-[#0991B2] dark:text-[#0991B2]' : 'text-gray-900 dark:text-white')}>{value}</p>
    )}
  </div>
)

// ── Main Page ─────────────────────────────────────────────────
const CreatorDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected, evmAddress } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const pods = usePodsStore((s) => s.pods)
  const isLoadingPods = usePodsStore((s) => s.isLoading)
  const addToast = useUIStore((s) => s.addToast)

  const [view, setView] = useState<DashboardView>('overview')
  const [messageCounts, setMessageCounts] = useState<Record<number, number>>({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [modActionAddress, setModActionAddress] = useState('')
  const [modActionLoading, setModActionLoading] = useState(false)
  const [modActionError, setModActionError] = useState<string | null>(null)

  // Helper to resolve .qf name or address to address
  const resolveToAddress = async (input: string): Promise<`0x${string}` | null> => {
    const trimmed = input.trim()
    
    // Already a valid address
    if (trimmed.startsWith('0x') && trimmed.length === 42) {
      return trimmed as `0x${string}`
    }
    
    // Try QNS resolution — handle both "name" and "name.qf"
    let qnsName = trimmed
    if (!qnsName.endsWith('.qf')) {
      qnsName = qnsName + '.qf'
    }
    // Remove the .qf for the lookup if the resolve function expects just the name
    const nameOnly = qnsName.replace(/\.qf$/, '')
    
    try {
      const resolved = await resolveQFName(nameOnly)
      if (resolved && resolved !== '0x0000000000000000000000000000000000000000') {
        return resolved as `0x${string}`
      }
    } catch (e) {
      console.error('[resolveToAddress] QNS lookup failed:', e)
    }
    
    return null
  }
  const [editingFee, setEditingFee] = useState(false)
  const [feeInputValue, setFeeInputValue] = useState('')
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeError, setFeeError] = useState('')
  const [localEntryFees, setLocalEntryFees] = useState<Record<number, bigint>>({})

  // Filter pods created by connected wallet
  const myCreatedPods = useMemo(() => {
    if (!evmAddress) return []
    return pods.filter(
      (p) => !p.isDefault && (p as CustomPod).creator?.toLowerCase() === evmAddress.toLowerCase()
    ) as CustomPod[]
  }, [pods, evmAddress])

  // Fetch message counts for all creator pods
  useEffect(() => {
    if (myCreatedPods.length === 0) {
      setLoadingCounts(false)
      return
    }
    let cancelled = false
    const fetchCounts = async () => {
      setLoadingCounts(true)
      const counts: Record<number, number> = {}
      await Promise.all(
        myCreatedPods.map(async (pod) => {
          counts[pod.id] = await cc.getPodMessageCount(pod.id)
        })
      )
      if (!cancelled) {
        setMessageCounts(counts)
        setLoadingCounts(false)
      }
    }
    fetchCounts()
    return () => { cancelled = true }
  }, [myCreatedPods.map(p => p.id).join(',')])

  // Aggregate stats
  const totalRevenue = useMemo(
    () => myCreatedPods.reduce((sum, pod) => sum + calcPodRevenue(pod), 0n),
    [myCreatedPods]
  )
  const totalMembers = useMemo(
    () => myCreatedPods.reduce((sum, pod) => sum + getAdjustedMemberCount(pod), 0),
    [myCreatedPods]
  )
  const totalMessages = useMemo(
    () => Object.values(messageCounts).reduce((sum, c) => sum + c, 0),
    [messageCounts]
  )

  // Get the pod for detail view
  const detailPodId = view.startsWith('pod-') ? Number(view.slice(4)) : null
  const detailPod = detailPodId !== null ? myCreatedPods.find((p) => p.id === detailPodId) : null

  // Reset edit fee state when switching pods
  useEffect(() => {
    setEditingFee(false)
    setFeeInputValue('')
    setFeeError('')
  }, [detailPodId])

  // Moderation handlers
  const handleBan = useCallback(async (podId: number) => {
    setModActionError(null)
    const addr = await resolveToAddress(modActionAddress)
    if (!addr) {
      setModActionError('Could not resolve address. Enter a valid 0x address or .qf name.')
      return
    }
    setModActionLoading(true)
    try {
      const receipt = await cc.banMember(podId, addr)
      await cc.waitForBlockSync(receipt.blockNumber)
      addToast('success', 'Member banned successfully')
      setModActionAddress('')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to ban member')
    } finally {
      setModActionLoading(false)
    }
  }, [modActionAddress, addToast])

  const handleUnban = useCallback(async (podId: number) => {
    setModActionError(null)
    const addr = await resolveToAddress(modActionAddress)
    if (!addr) {
      setModActionError('Could not resolve address. Enter a valid 0x address or .qf name.')
      return
    }
    setModActionLoading(true)
    try {
      const receipt = await cc.unbanMember(podId, addr)
      await cc.waitForBlockSync(receipt.blockNumber)
      addToast('success', 'Member unbanned successfully')
      setModActionAddress('')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to unban member')
    } finally {
      setModActionLoading(false)
    }
  }, [modActionAddress, addToast])

  const handleAddMod = useCallback(async (podId: number) => {
    setModActionError(null)
    const addr = await resolveToAddress(modActionAddress)
    if (!addr) {
      setModActionError('Could not resolve address. Enter a valid 0x address or .qf name.')
      return
    }
    setModActionLoading(true)
    try {
      const receipt = await cc.addMod(podId, addr)
      await cc.waitForBlockSync(receipt.blockNumber)
      addToast('success', 'Moderator added successfully')
      setModActionAddress('')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to add moderator')
    } finally {
      setModActionLoading(false)
    }
  }, [modActionAddress, addToast])

  const handleRemoveMod = useCallback(async (podId: number) => {
    setModActionError(null)
    const addr = await resolveToAddress(modActionAddress)
    if (!addr) {
      setModActionError('Could not resolve address. Enter a valid 0x address or .qf name.')
      return
    }
    setModActionLoading(true)
    try {
      const receipt = await cc.removeMod(podId, addr)
      await cc.waitForBlockSync(receipt.blockNumber)
      addToast('success', 'Moderator removed successfully')
      setModActionAddress('')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to remove moderator')
    } finally {
      setModActionLoading(false)
    }
  }, [modActionAddress, addToast])

  const handleUpdateFee = useCallback(async (podId: number) => {
    const newFeeWei = parseQFToWei(feeInputValue)
    setFeeLoading(true)
    setFeeError('')
    try {
      const receipt = await cc.setEntryFee(podId, newFeeWei)
      await cc.waitForBlockSync(receipt.blockNumber)
      // Confirm fee update from chain (ensures we show actual on-chain value)
      const confirmedFee = await cc.getEntryFee(podId)
      setLocalEntryFees(prev => ({ ...prev, [podId]: confirmedFee }))
      // Refresh all pod data so other tabs reflect the change
      await usePodsStore.getState().fetchPods()
      addToast('success', 'Entry fee updated successfully')
      setEditingFee(false)
      setFeeInputValue('')
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : 'Failed to update entry fee')
    } finally {
      setFeeLoading(false)
    }
  }, [feeInputValue, addToast])

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Creator Dashboard</h2>
        <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to manage your pods</p>
        <button
          onClick={() => setShowConnectWallet(true)}
          className="bg-[#0991B2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  const activeBaseView = view.startsWith('pod-') ? 'pods' : view

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* ── Internal Sidebar ── */}
      <aside className="hidden md:flex w-48 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Creator</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Dashboard</p>
        </div>
        <nav className="flex-1 px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors duration-150 rounded-none',
                    activeBaseView === item.id
                      ? 'bg-[#0991B2] text-white font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <p className="text-[10px] text-gray-400 dark:text-gray-600">QFLink v1.0</p>
        </div>
      </aside>

      {/* ── Mobile Tab Bar ── */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-20 flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium text-center transition-colors',
              activeBaseView === item.id ? 'text-[#0991B2] border-b-2 border-[#0991B2]' : 'text-gray-500'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#0D0D0D] pt-10 md:pt-0">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">

          {/* ── OVERVIEW ── */}
          {view === 'overview' && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-1">Overview</h1>
                <p className="text-sm text-gray-500">Your creator stats at a glance</p>
              </div>

              {isLoadingPods ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 p-5">
                      <Skeleton className="h-4 w-20 mb-4" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : myCreatedPods.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0991B2]/10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0991B2] dark:text-[#0991B2]">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pods yet</h3>
                  <p className="text-sm text-gray-500 mb-6">Create your first pod to start building your community and earning revenue.</p>
                  <button
                    onClick={() => navigate('/create-pod')}
                    className="bg-[#0991B2] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors"
                  >
                    Create Pod
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Revenue"
                      value={`${formatQF(totalRevenue)} QF`}
                      accent
                      loading={loadingCounts}
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      }
                    />
                    <StatCard
                      label="Total Members"
                      value={totalMembers.toLocaleString()}
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      }
                    />
                    <StatCard
                      label="Active Pods"
                      value={myCreatedPods.length.toString()}
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      }
                    />
                    <StatCard
                      label="Total Messages"
                      value={totalMessages.toLocaleString()}
                      loading={loadingCounts}
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Quick pods preview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Pods</h2>
                      <button
                        onClick={() => setView('pods')}
                        className="text-xs font-semibold text-[#0991B2] dark:text-[#0991B2] hover:text-[#0880A0] dark:hover:text-[#0AA1C2] transition-colors"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myCreatedPods.slice(0, 4).map((pod) => (
                        <PodSummaryCard
                          key={pod.id}
                          pod={pod}
                          messageCount={messageCounts[pod.id] ?? 0}
                          onManage={() => setView(`pod-${pod.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── MY PODS ── */}
          {view === 'pods' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-1">My Pods</h1>
                  <p className="text-sm text-gray-500">{myCreatedPods.length} pod{myCreatedPods.length !== 1 ? 's' : ''} created</p>
                </div>
                <button
                  onClick={() => navigate('/create-pod')}
                  className="flex items-center gap-2 bg-[#0991B2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Pod
                </button>
              </div>

              {isLoadingPods ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 p-5">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-16" />
                        <div className="flex-1" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myCreatedPods.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <p className="text-sm text-gray-500 mb-4">You haven't created any pods yet.</p>
                  <button
                    onClick={() => navigate('/create-pod')}
                    className="bg-[#0991B2] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors"
                  >
                    Create Your First Pod
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myCreatedPods.map((pod) => (
                    <PodRow
                      key={pod.id}
                      pod={pod}
                      messageCount={messageCounts[pod.id] ?? 0}
                      onManage={() => {
                        setModActionAddress('')
                        setView(`pod-${pod.id}`)
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── POD DETAIL ── */}
          {detailPod && (
            <>
              <button
                onClick={() => setView('pods')}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to My Pods
              </button>

              <div className="flex items-center gap-3 mb-6">
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{detailPod.name}</h1>
                <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 border', CATEGORY_COLORS[detailPod.category] || CATEGORY_COLORS.trading)}>
                  {detailPod.category}
                </span>
              </div>

              {/* Pod stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Members"
                  value={getAdjustedMemberCount(detailPod).toString()}
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
                />
                <StatCard
                  label="Messages"
                  value={(messageCounts[detailPod.id] ?? 0).toLocaleString()}
                  loading={loadingCounts}
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                />
                <StatCard
                  label="Entry Fee"
                  value={(() => { const fee = localEntryFees[detailPod.id] ?? detailPod.entryFee ?? 0n; return fee > 0n ? `${formatQF(fee)} QF` : 'Free' })()}
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                />
                <StatCard
                  label="Revenue"
                  value={`${formatQF(calcPodRevenue(detailPod))} QF`}
                  accent
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
                />
              </div>

              {/* Pod info */}
              <div className="border border-gray-200 dark:border-gray-800 p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pod Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Description</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5">{detailPod.description || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Token Gate</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5">
                      {detailPod.minBalance && detailPod.minBalance > 0n
                        ? `${formatCompactBalance(detailPod.minBalance)} QF minimum`
                        : 'None'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tier</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{detailPod.tier}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pod ID</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5">#{detailPod.id}</p>
                  </div>
                </div>
              </div>

              {/* Moderation actions */}
              <div className="border border-gray-200 dark:border-gray-800 p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Moderation</h3>
                <p className="text-xs text-gray-500 mb-4">Enter a member's EVM address or .qf name to perform moderation actions.</p>
                <input
                  type="text"
                  placeholder="Enter wallet address or .qf name"
                  value={modActionAddress}
                  onChange={(e) => setModActionAddress(e.target.value)}
                  className="w-full h-10 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors mb-2"
                />
                {modActionAddress && !modActionAddress.startsWith('0x') && (
                  <span className="text-gray-500 text-xs block mb-2">Will resolve QNS name to wallet address</span>
                )}
                {modActionError && <p className="text-red-400 text-xs mb-2">{modActionError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBan(detailPod.id)}
                    disabled={modActionLoading || !modActionAddress.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-red-600/20 text-red-600 dark:text-red-400 border border-red-600/30 hover:bg-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {modActionLoading ? 'Processing...' : 'Ban Member'}
                  </button>
                  <button
                    onClick={() => handleUnban(detailPod.id)}
                    disabled={modActionLoading || !modActionAddress.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-green-600/20 text-green-600 dark:text-green-400 border border-green-600/30 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {modActionLoading ? 'Processing...' : 'Unban Member'}
                  </button>
                  <button
                    onClick={() => handleAddMod(detailPod.id)}
                    disabled={modActionLoading || !modActionAddress.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-[#0991B2]/20 text-[#0991B2] dark:text-[#0AA1C2] border border-[#0991B2]/30 hover:bg-[#0991B2]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {modActionLoading ? 'Processing...' : 'Add Mod'}
                  </button>
                  <button
                    onClick={() => handleRemoveMod(detailPod.id)}
                    disabled={modActionLoading || !modActionAddress.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-orange-600/20 text-orange-600 dark:text-orange-400 border border-orange-600/30 hover:bg-orange-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {modActionLoading ? 'Processing...' : 'Remove Mod'}
                  </button>
                </div>
              </div>

              {/* Edit Entry Fee */}
              <div className="border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Entry Fee</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Current: {(() => { const fee = localEntryFees[detailPod.id] ?? detailPod.entryFee ?? 0n; return fee > 0n ? `${formatQF(fee)} QF` : 'Free' })()}
                    </p>
                  </div>
                  {!editingFee && (
                    <button
                      onClick={() => {
                        const fee = localEntryFees[detailPod.id] ?? detailPod.entryFee ?? 0n
                        setFeeInputValue(fee > 0n ? formatQF(fee) : '0')
                        setFeeError('')
                        setEditingFee(true)
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-[#0991B2]/20 text-[#0991B2] dark:text-[#0AA1C2] border border-[#0991B2]/30 hover:bg-[#0991B2]/30 transition-colors"
                    >
                      Edit Fee
                    </button>
                  )}
                </div>
                {editingFee && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Fee in QF (e.g. 50)"
                        value={feeInputValue}
                        onChange={(e) => setFeeInputValue(e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        disabled={feeLoading}
                        className="flex-1 h-10 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                      />
                      <button
                        onClick={() => setFeeInputValue('0')}
                        disabled={feeLoading}
                        className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        Set to Free
                      </button>
                    </div>
                    {feeError && (
                      <p className="text-xs text-red-500">{feeError}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateFee(detailPod.id)}
                        disabled={feeLoading || feeInputValue === ''}
                        className="px-4 py-2 text-xs font-semibold bg-[#0991B2] text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {feeLoading ? 'Updating...' : 'Update Fee'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingFee(false)
                          setFeeInputValue('')
                          setFeeError('')
                        }}
                        disabled={feeLoading}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── REVENUE ── */}
          {view === 'revenue' && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-1">Revenue</h1>
                <p className="text-sm text-gray-500">Your earnings from pod entry fees</p>
              </div>

              {/* Total earned card */}
              <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Total Earned (All-Time)</p>
                {loadingCounts ? (
                  <Skeleton className="h-10 w-40" />
                ) : (
                  <p className="text-3xl font-bold text-[#0991B2] dark:text-[#0991B2]">{formatQF(totalRevenue)} QF</p>
                )}
              </div>

              {/* Treasury fee explanation */}
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  5% of entry fees go to the QFLink protocol treasury. You receive <span className="text-gray-900 dark:text-white font-semibold">95%</span> of all entry fees.
                </p>
              </div>

              {/* Per-pod breakdown */}
              {myCreatedPods.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Breakdown by Pod</h2>
                  <div className="border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-5 gap-2 px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pod</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Members</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Entry Fee</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Gross</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">You Earned</span>
                    </div>
                    {/* Table rows */}
                    {myCreatedPods.map((pod) => {
                      const fee = pod.entryFee ?? 0n
                      const payingMembers = Math.max(0, (pod.memberCount || 0) - 2)
                      const gross = fee > 0n ? BigInt(payingMembers) * fee : 0n
                      const earned = calcPodRevenue(pod)
                      return (
                        <div
                          key={pod.id}
                          className="grid grid-cols-5 gap-2 px-5 py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{pod.name}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 text-right">{getAdjustedMemberCount(pod)}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 text-right">
                            {fee > 0n ? `${formatQF(fee)} QF` : 'Free'}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 text-right">
                            {gross > 0n ? `${formatQF(gross)} QF` : '—'}
                          </span>
                          <span className="text-sm font-semibold text-[#0991B2] dark:text-[#0991B2] text-right">
                            {earned > 0n ? `${formatQF(earned)} QF` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SETTINGS (placeholder) ── */}
          {view === 'settings' && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-1">Settings</h1>
                <p className="text-sm text-gray-500">Creator settings and preferences</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Creator settings including payout wallet configuration, notification preferences, and pod templates will be available in a future update.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Pod Summary Card (for Overview) ──────────────────────────
const PodSummaryCard: React.FC<{
  pod: CustomPod
  messageCount: number
  onManage: () => void
}> = ({ pod, messageCount, onManage }) => {
  const fee = pod.entryFee ?? 0n

  const revenue = calcPodRevenue(pod)
  return (
    <div className="border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{pod.name}</h3>
        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 border', CATEGORY_COLORS[pod.category] || CATEGORY_COLORS.trading)}>
          {pod.category}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>{getAdjustedMemberCount(pod)} members</span>
        <span>{messageCount} msgs</span>
        <span>{fee > 0n ? `${formatQF(fee)} QF fee` : 'Free'}</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0991B2] dark:text-[#0991B2]">
          {revenue > 0n ? `${formatQF(revenue)} QF earned` : 'No revenue yet'}
        </p>
        <button
          onClick={onManage}
          className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Manage →
        </button>
      </div>
    </div>
  )
}

// ── Pod Row (for My Pods list) ───────────────────────────────
const PodRow: React.FC<{
  pod: CustomPod
  messageCount: number
  onManage: () => void
}> = ({ pod, messageCount, onManage }) => {
  const fee = pod.entryFee ?? 0n

  const revenue = calcPodRevenue(pod)
  return (
    <div className="border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Desktop: single row layout */}
      {/* Mobile: stacked layout */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Top: Pod name + badge (mobile) / Left side (desktop) */}
        <div className="flex items-start md:items-center gap-2 md:gap-3 w-full md:w-auto">
          <h3 className="text-lg md:text-sm font-semibold md:font-bold text-white md:text-gray-900 md:dark:text-white md:truncate">{pod.name}</h3>
          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 border flex-shrink-0', CATEGORY_COLORS[pod.category] || CATEGORY_COLORS.trading)}>
            {pod.category}
          </span>
        </div>
        
        {/* Middle: Stats grid (mobile) / Center (desktop) */}
        <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-6 md:ml-auto">
          <div className="text-center md:text-center">
            <p className="text-white md:text-gray-900 dark:text-white font-semibold text-sm md:text-xs">{getAdjustedMemberCount(pod)}</p>
            <p className="text-[10px] text-gray-500">Members</p>
          </div>
          <div className="text-center md:text-center">
            <p className="text-white md:text-gray-900 dark:text-white font-semibold text-sm md:text-xs">{fee > 0n ? `${formatQF(fee)}` : 'Free'}</p>
            <p className="text-[10px] text-gray-500">{fee > 0n ? 'QF Fee' : 'Fee'}</p>
          </div>
          <div className="text-center md:text-center">
            <p className="text-white md:text-gray-900 dark:text-white font-semibold text-sm md:text-xs">{messageCount}</p>
            <p className="text-[10px] text-gray-500">Messages</p>
          </div>
          <div className="text-center md:text-center">
            <p className="text-[#0991B2] dark:text-[#0991B2] font-semibold text-sm md:text-xs">{revenue > 0n ? `${formatQF(revenue)}` : '—'}</p>
            <p className="text-[10px] text-gray-500">{revenue > 0n ? 'QF Rev' : 'Revenue'}</p>
          </div>
        </div>
        
        {/* Bottom: Manage button (mobile) / Right side (desktop) */}
        <button
          onClick={onManage}
          className="w-full md:w-auto px-4 py-2 text-xs font-semibold bg-[#0991B2] text-white hover:bg-[#0880A0] transition-colors mt-2 md:mt-0"
        >
          Manage
        </button>
      </div>
    </div>
  )
}

export default CreatorDashboardPage
