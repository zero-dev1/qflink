import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PodInfo } from './PodInfo'
import { MessageInput } from '@/components/messages/MessageInput'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { truncateAddress, formatMessageTime, formatBalance } from '@/lib/utils'
import { TokenGateBar } from './TokenGateBar'
import * as cc from '@/lib/contractCalls'
import { reverseResolve } from '@/lib/qns'
import { usePodsStore } from '@/stores/pods'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import type { Pod, PodMessage, DefaultPod, CustomPod } from '@/types'
import { cn } from '@/lib/utils'

interface PodChatProps {
  pod: Pod
  messages: PodMessage[]
  members: string[]
  currentUserAddress: string
  userBalance: bigint
  onSend: (content: string) => void
  onBack: () => void
  onInvite?: () => void
  onLeave?: () => void
  onRefreshMembers?: () => void
}

const formatHolderReq = (minBal: bigint): string => {
  const whole = minBal / (10n ** 18n)
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(0)}M+ Holders`
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K+ Holders`
  return `${whole}+ Holders`
}

// Type for dropdown menu state
interface DropdownState {
  isOpen: boolean
  selectedMember: string | null
  position: { top: number; left: number } | null
}

export const PodChat: React.FC<PodChatProps> = ({
  pod,
  messages,
  members,
  currentUserAddress,
  userBalance,
  onSend,
  onBack,
  onInvite,
  onLeave,
  onRefreshMembers,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const [senderProfiles, setSenderProfiles] = useState<Map<string, string>>(new Map())
  const [senderQFNames, setSenderQFNames] = useState<Map<string, string>>(new Map())
  const profilesFetchedRef = useRef<Set<string>>(new Set())
  const qfNamesFetchedRef = useRef<Set<string>>(new Set())
  const [showPodInfo, setShowPodInfo] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  
  // Member info for mobile pod info (creator, mods, banned)
  const [memberProfiles, setMemberProfiles] = useState<Map<string, string>>(new Map())
  const [memberQFNames, setMemberQFNames] = useState<Map<string, string>>(new Map())
  const [moderators, setModerators] = useState<string[]>([])
  const [bannedStatus, setBannedStatus] = useState<Map<string, boolean>>(new Map())
  const [modStatus, setModStatus] = useState<Map<string, boolean>>(new Map())
  const [creatorQFName, setCreatorQFName] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  
  // Dropdown menu state for mobile member actions
  const [dropdown, setDropdown] = useState<DropdownState>({
    isOpen: false,
    selectedMember: null,
    position: null,
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  
  const myPods = usePodsStore((s) => s.myPods)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  
  const getSenderName = (senderAddress: string): string => {
    const normalizedAddr = senderAddress.toLowerCase()
    
    // Check if it's the current user
    if (evmAddress && normalizedAddr === evmAddress.toLowerCase()) {
      return 'You'
    }
    
    // Check QNS name first (priority)
    const qfName = senderQFNames.get(normalizedAddr)
    if (qfName) {
      return qfName
    }
    
    // Check cached profile
    const profileName = senderProfiles.get(normalizedAddr)
    if (profileName) {
      return profileName
    }
    
    return truncateAddress(senderAddress)
  }
  
  // Fetch profiles and QNS names for all unique senders
  useEffect(() => {
    const fetchData = async () => {
      const uniqueSenders = new Set<string>()
      messages.forEach(msg => {
        const addr = msg.sender.toLowerCase()
        if (addr !== evmAddress?.toLowerCase()) {
          if (!profilesFetchedRef.current.has(addr)) {
            uniqueSenders.add(msg.sender)
          }
        }
      })
      
      if (uniqueSenders.size === 0) return
      
      const newProfiles = new Map(senderProfiles)
      const newQFNames = new Map(senderQFNames)
      
      await Promise.all(Array.from(uniqueSenders).map(async (addr) => {
        const lowerAddr = addr.toLowerCase()
        profilesFetchedRef.current.add(lowerAddr)
        
        // Fetch both profile and QNS name in parallel
        try {
          const profile = await cc.getProfile(addr as `0x${string}`)
          if (profile?.displayName) {
            newProfiles.set(lowerAddr, profile.displayName)
          }
        } catch {}
        
        try {
          const qfName = await reverseResolve(addr)
          if (qfName) {
            newQFNames.set(lowerAddr, qfName)
            qfNamesFetchedRef.current.add(lowerAddr)
          }
        } catch {}
      }))
      
      setSenderProfiles(newProfiles)
      setSenderQFNames(newQFNames)
    }
    
    fetchData()
  }, [messages, evmAddress])

  const handleScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const isDefault = (pod as DefaultPod).isDefault === true
  const isCustom = !isDefault
  const customPod = isCustom ? (pod as CustomPod) : null
  const holderReq = isDefault ? formatHolderReq((pod as DefaultPod).minBalance) : ''
  const minBalance = (pod as DefaultPod).minBalance ?? BigInt(0)

  // Extract unique sender addresses from messages for member count
  const uniqueSenders = React.useMemo(() => {
    const senders = new Set<string>()
    messages.forEach(msg => senders.add(msg.sender))
    return Array.from(senders)
  }, [messages])

  const activeMemberCount = uniqueSenders.length

  // Resolve creator's QNS name for mobile pod info
  useEffect(() => {
    if (!isCustom || !customPod?.creator) return
    
    let cancelled = false
    const resolveCreator = async () => {
      try {
        const qfName = await reverseResolve(customPod.creator!)
        if (!cancelled && qfName) {
          setCreatorQFName(qfName)
        }
      } catch {}
    }
    
    resolveCreator()
    return () => { cancelled = true }
  }, [isCustom, customPod?.creator])

  // Fetch moderators and banned status for mobile pod info
  useEffect(() => {
    if (!isCustom || !customPod || !evmAddress) return
    if (uniqueSenders.length === 0) return
    
    let cancelled = false
    
    const fetchStatus = async () => {
      const banned = new Map<string, boolean>()
      const mods = new Map<string, boolean>()
      
      // Check first 20 members to avoid overwhelming RPC
      const sendersToCheck = uniqueSenders.slice(0, 20)
      
      await Promise.all(
        sendersToCheck.map(async (addr) => {
          try {
            const [isBannedStatus, isModStatus] = await Promise.all([
              cc.isBanned(pod.id, addr as `0x${string}`),
              cc.isMod(pod.id, addr as `0x${string}`)
            ])
            banned.set(addr.toLowerCase(), isBannedStatus)
            mods.set(addr.toLowerCase(), isModStatus)
          } catch {
            banned.set(addr.toLowerCase(), false)
            mods.set(addr.toLowerCase(), false)
          }
        })
      )
      
      if (!cancelled) {
        setBannedStatus(banned)
        setModStatus(mods)
        const modsFromStatus = Array.from(mods.entries())
          .filter(([_, isMod]) => isMod)
          .map(([addr, _]) => addr.toLowerCase())
        setModerators(modsFromStatus)
      }
    }
    
    fetchStatus()
    return () => { cancelled = true }
  }, [pod.id, isCustom, customPod, uniqueSenders.length, evmAddress])

  // Resolve QNS names and profiles for ALL unique senders (not just mods)
  useEffect(() => {
    if (uniqueSenders.length === 0) return
    
    let cancelled = false
    
    const resolveMemberNames = async () => {
      const qfNames = new Map<string, string>(memberQFNames)
      const profiles = new Map<string, string>(memberProfiles)
      
      // Resolve names for all unique senders (up to 50 to avoid overwhelming RPC)
      const sendersToResolve = uniqueSenders.slice(0, 50)
      
      await Promise.all(
        sendersToResolve.map(async (addr) => {
          const lowerAddr = addr.toLowerCase()
          
          // Skip if already resolved
          if (qfNames.has(lowerAddr) && profiles.has(lowerAddr)) return
          
          try {
            // Fetch QNS name
            const qfName = await reverseResolve(addr)
            if (qfName) {
              qfNames.set(lowerAddr, qfName)
            }
          } catch {}
          
          try {
            // Fetch profile
            const profile = await cc.getProfile(addr as `0x${string}`)
            if (profile?.displayName) {
              profiles.set(lowerAddr, profile.displayName)
            }
          } catch {}
        })
      )
      
      if (!cancelled) {
        setMemberQFNames(qfNames)
        setMemberProfiles(profiles)
      }
    }
    
    resolveMemberNames()
    return () => { cancelled = true }
  }, [uniqueSenders])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setDropdown({ isOpen: false, selectedMember: null, position: null })
      }
    }

    if (dropdown.isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdown.isOpen])

  // Check if current user is creator
  const isCreator = isCustom && customPod?.creator?.toLowerCase() === evmAddress?.toLowerCase()
  
  // Check if current user is a mod
  const isCurrentUserMod = evmAddress ? modStatus.get(evmAddress.toLowerCase()) || false : false

  // Handle opening dropdown
  const handleOpenDropdown = (addr: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setDropdown({
      isOpen: true,
      selectedMember: addr,
      position: {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 120, // Align to left of button, dropdown width is ~120px
      },
    })
  }

  // Handle close dropdown
  const handleCloseDropdown = () => {
    setDropdown({ isOpen: false, selectedMember: null, position: null })
  }

  // Handle send message action
  const handleSendMessage = (addr: string) => {
    navigate(`/direct/${addr}`)
    setShowMembersModal(false)
    handleCloseDropdown()
  }

  // Handle add mod action
  const handleAddMod = async (addr: string) => {
    if (!isCustom) return
    
    // Check if pod is free
    const isFreePod = (customPod?.tier === 'free' || (pod as CustomPod).entryFee === 0n)
    
    if (isFreePod) {
      addToast('error', "Free pods don't support additional moderators. Create a Pro pod for up to 3 mods.")
      handleCloseDropdown()
      return
    }
    
    try {
      await cc.addMod(Number(pod.id), addr as `0x${string}`)
      addToast('success', 'Moderator added')
      
      // Refresh status
      const isModStatus = await cc.isMod(Number(pod.id), addr as `0x${string}`)
      setModStatus(prev => new Map(prev).set(addr.toLowerCase(), isModStatus))
      
      if (onRefreshMembers) {
        onRefreshMembers()
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to add moderator')
    }
    handleCloseDropdown()
  }

  // Handle remove mod action
  const handleRemoveMod = async (addr: string) => {
    if (!isCustom) return
    
    try {
      await cc.removeMod(Number(pod.id), addr as `0x${string}`)
      addToast('success', 'Moderator removed')
      
      // Refresh status
      const isModStatus = await cc.isMod(Number(pod.id), addr as `0x${string}`)
      setModStatus(prev => new Map(prev).set(addr.toLowerCase(), isModStatus))
      
      if (onRefreshMembers) {
        onRefreshMembers()
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to remove moderator')
    }
    handleCloseDropdown()
  }

  // Handle ban action
  const handleBan = async (addr: string) => {
    const isBanned = bannedStatus.get(addr.toLowerCase())
    
    try {
      if (isBanned) {
        await cc.unbanMember(Number(pod.id), addr as `0x${string}`)
        addToast('success', 'Member unbanned')
      } else {
        await cc.banMember(Number(pod.id), addr as `0x${string}`)
        addToast('success', 'Member banned')
      }
      
      // Refresh status
      const isBannedStatus = await cc.isBanned(Number(pod.id), addr as `0x${string}`)
      setBannedStatus(prev => new Map(prev).set(addr.toLowerCase(), isBannedStatus))
      
      if (onRefreshMembers) {
        onRefreshMembers()
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to ban/unban member')
    }
    handleCloseDropdown()
  }

  // Mobile pod info overlay
  if (showPodInfo) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0D0D0D] lg:hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4 py-3">
          <button 
            onClick={() => setShowPodInfo(false)} 
            className="flex-shrink-0 text-qx-text-muted hover:text-qx-text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-qx-text-primary">Pod Info</h3>
          </div>
        </div>

        {/* Pod Info Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* About */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">About</h4>
            <p className="text-sm text-qx-text-secondary leading-relaxed">{pod.description}</p>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Requirements</h4>
            {isDefault ? (
              <p className="text-sm text-qx-text-secondary">
                Requires {formatBalance(minBalance)} QF aggregated balance
              </p>
            ) : (
              <div className="space-y-2">
                {customPod?.tier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Tier</span>
                    <span className="capitalize font-medium text-qx-text-primary">{customPod.tier}</span>
                  </div>
                )}
                {customPod?.joinMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Join Method</span>
                    <span className="capitalize font-medium text-qx-text-primary">
                      {customPod.joinMethod === 'balance' ? 'Balance-Based' : 'Invite-Only'}
                    </span>
                  </div>
                )}
                {customPod?.minBalance !== undefined && customPod.minBalance > 0n && (
                  <div className="flex justify-between text-sm">
                    <span className="text-qx-text-muted">Min Balance</span>
                    <span className="font-medium text-cyan-600">{formatBalance(customPod.minBalance)} QF</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Members with View Members button */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Members</h4>
            <p className="text-sm text-qx-text-secondary mb-3">
              Open to qualified holders
              {activeMemberCount > 0 && (
                <span className="ml-1 text-cyan-600">({activeMemberCount} active)</span>
              )}
            </p>
            <button
              onClick={() => {
                setShowPodInfo(false)
                setShowMembersModal(true)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-qx-border-prominent px-3 py-2.5 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              View Members
            </button>
          </div>

          {/* Creator with QNS name */}
          {isCustom && customPod?.creator && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Creator</h4>
              <p className="text-sm text-qx-text-secondary">
                {creatorQFName || truncateAddress(customPod.creator, 'evm', 6)}
              </p>
            </div>
          )}

          {/* Moderators */}
          {isCustom && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Moderators</h4>
              {moderators.filter(m => m.toLowerCase() !== customPod?.creator?.toLowerCase()).length === 0 ? (
                <p className="text-sm text-qx-text-muted">No moderators</p>
              ) : (
                <div className="space-y-1">
                  {moderators
                    .filter(m => m.toLowerCase() !== customPod?.creator?.toLowerCase())
                    .map((modAddr) => {
                      const qfName = memberQFNames.get(modAddr.toLowerCase())
                      const profileName = memberProfiles.get(modAddr)
                      return (
                        <p key={modAddr} className="text-sm text-qx-text-secondary">
                          {qfName || profileName || truncateAddress(modAddr, 'evm', 6)}
                        </p>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* Banned Users */}
          {isCustom && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-2">Banned Users</h4>
              {Array.from(bannedStatus.entries()).filter(([_, isBanned]) => isBanned).length === 0 ? (
                <p className="text-sm text-qx-text-muted">No banned users</p>
              ) : (
                <div className="space-y-1">
                  {Array.from(bannedStatus.entries())
                    .filter(([_, isBanned]) => isBanned)
                    .map(([addr, _]) => {
                      const qfName = memberQFNames.get(addr)
                      const profileName = memberProfiles.get(addr)
                      return (
                        <p key={addr} className="text-sm text-qx-text-secondary">
                          {qfName || profileName || truncateAddress(addr, 'evm', 6)}
                        </p>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 px-4 pb-6 pt-2 space-y-3 border-t border-gray-200 dark:border-gray-800">
          {onInvite && (
            <button
              onClick={() => {
                setShowPodInfo(false)
                onInvite()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-qx-border-prominent px-3 py-3 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Invite Link
            </button>
          )}

          {onLeave && (
            <button
              onClick={() => {
                setShowPodInfo(false)
                onLeave()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave Pod
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left column: YOUR PODS list (desktop only) */}
      <div className="hidden lg:flex w-48 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-qx-text-muted">Your Pods</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {myPods.map((p) => {
            const isActive = p.id === pod.id
            const pIsDefault = (p as DefaultPod).isDefault === true
            const pHolderReq = pIsDefault ? formatHolderReq((p as DefaultPod).minBalance) : 'Open'
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/pod/${p.id}`)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors border-l-2 border-b border-b-gray-200 dark:border-b-gray-800',
                  isActive
                    ? 'border-l-cyan-600 bg-gray-100 dark:bg-white/5'
                    : 'border-l-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                )}
              >
                <p className="text-sm font-semibold truncate text-qx-text-primary">
                  {p.name}
                </p>
                <p className="text-xs text-qx-text-muted truncate">{pHolderReq}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center column: chat */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Chat header */}
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4 py-3">
          <button onClick={onBack} className="flex-shrink-0 text-qx-text-muted hover:text-qx-text-primary transition-colors lg:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-qx-text-primary">{pod.name}</h3>
            {holderReq && <p className="text-xs text-qx-text-secondary">{holderReq}</p>}
            {/* TokenGateBar for pods with threshold > 0 */}
            {minBalance > 0n && (
              <div className="mt-1.5 max-w-xs">
                <TokenGateBar userBalance={userBalance} threshold={minBalance} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowPodInfo(true)}
              className="flex items-center gap-1.5 text-qx-text-secondary hover:text-qx-text-primary transition-colors lg:hidden"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm">Open</span>
            </button>
            <button className="text-qx-text-secondary hover:text-qx-text-primary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance sub-header: only show when user does NOT yet qualify */}
        {isDefault && userBalance < (pod as DefaultPod).minBalance && (() => {
          const minBal = (pod as DefaultPod).minBalance
          const remaining = minBal - userBalance
          const fmtBal = (v: bigint) => {
            const w = v / (10n ** 18n)
            if (w >= 1_000_000n) return `${(Number(w) / 1_000_000).toFixed(1)}M`
            if (w >= 1_000n) return `${(Number(w) / 1_000).toFixed(0)}K`
            return w.toString()
          }
          return (
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-5 py-3 bg-white dark:bg-[#0D0D0D]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-qx-text-secondary">
                  You hold <span className="font-bold text-qx-text-primary">{fmtBal(userBalance)} QF</span>
                </p>
                <p className="text-xs text-qx-text-muted">{fmtBal(remaining)} to go</p>
              </div>
              <ProgressBar current={userBalance} target={minBal} showLabels={false} />
            </div>
          )
        })()}

        {/* Messages */}
        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-5 py-4 bg-gray-50 dark:bg-white/[0.03]">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-qx-text-muted">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = evmAddress && msg.sender.toLowerCase() === evmAddress.toLowerCase()
              const senderName = getSenderName(msg.sender)
              
              // Check if consecutive from same sender
              const prevMsg = i > 0 ? messages[i - 1] : null
              const isConsecutive = prevMsg && msg.sender.toLowerCase() === prevMsg.sender.toLowerCase()
              
              // Check if should show timestamp (last in group or >2min gap)
              const nextMsg = i < messages.length - 1 ? messages[i + 1] : null
              const isLastInGroup = !nextMsg || nextMsg.sender.toLowerCase() !== msg.sender.toLowerCase()
              const timeGap = prevMsg ? msg.timestamp - prevMsg.timestamp : 0
              const showTimestamp = !isConsecutive || isLastInGroup || timeGap > 2 * 60 * 1000
              
              return (
                <div key={msg.id} className={cn('flex flex-col', isConsecutive ? 'mb-1' : 'mb-4', isMine ? 'items-end' : 'items-start')}>
                  {!isMine && !isConsecutive && (
                    <p className={cn(
                      'text-xs font-medium mb-1 px-1',
                      senderQFNames.get(msg.sender.toLowerCase()) ? 'text-cyan-600' : 'text-qx-text-secondary'
                    )}>
                      {senderName}
                    </p>
                  )}
                  <div className={cn(
                    'max-w-[65%] rounded-bubble px-4 py-2.5',
                    isMine ? 'bg-cyan-600 text-white' : 'bg-qx-msg-other text-qx-msg-other-text'
                  )}>
                    <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                  </div>
                  {showTimestamp && (
                    <p className="text-xs text-qx-text-muted mt-1 px-1">
                      {formatMessageTime(msg.timestamp)}
                    </p>
                  )}
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0">
          <MessageInput onSend={onSend} maxLength={500} />
        </div>
      </div>

      {/* Right column: Pod Info (desktop only) */}
      <div className="hidden lg:block">
        <PodInfo
          pod={pod}
          members={members}
          messages={messages}
          currentUserAddress={currentUserAddress}
          userBalance={userBalance}
          onInvite={onInvite}
          onLeave={onLeave}
          onRefreshMembers={onRefreshMembers}
        />
      </div>

      {/* View Members Modal (mobile) */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => {
          setShowMembersModal(false)
          setMemberSearch('')
          handleCloseDropdown()
        }}
        title={`${pod.name} Members (${activeMemberCount} active)`}
      >
        <div className="space-y-3">
          <div className="relative">
            <svg
              width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-qx-text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full border border-qx-border-prominent bg-qx-elevated pl-8 pr-3 py-2 text-sm text-qx-text-primary placeholder:text-qx-text-muted focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800">
            {uniqueSenders
              .filter((addr) => addr.toLowerCase().includes(memberSearch.toLowerCase()))
              .length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-qx-text-muted">No members found.</p>
              </div>
            ) : (
              uniqueSenders
                .filter((addr) => addr.toLowerCase().includes(memberSearch.toLowerCase()))
                .map((addr) => {
                  const qfName = memberQFNames.get(addr.toLowerCase())
                  const profileName = memberProfiles.get(addr)
                  const isCurrentUser = addr.toLowerCase() === evmAddress?.toLowerCase()
                  const isMod = modStatus.get(addr.toLowerCase()) || false
                  const isBanned = bannedStatus.get(addr.toLowerCase()) || false
                  
                  // Determine which actions are available
                  const canShowActions = !isCurrentUser
                  const canAddMod = isCreator && !isMod
                  const canBan = (isCreator || isCurrentUserMod) && !isCurrentUser
                  
                  return (
                    <div key={addr} className="flex items-center gap-3 px-3 py-2.5 hover:bg-qx-elevated relative">
                      <Avatar address={addr} size="sm" />
                      <div className="flex-1 min-w-0">
                        {qfName || profileName ? (
                          <p className={`text-sm font-medium truncate ${qfName ? 'text-cyan-600' : 'text-qx-text-primary'}`}>
                            {qfName || profileName}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-qx-text-primary font-mono">
                            {truncateAddress(addr, 'evm', 8)}
                          </p>
                        )}
                        {isCurrentUser && (
                          <p className="text-xs text-cyan-600">You</p>
                        )}
                        {isMod && !isCurrentUser && (
                          <p className="text-xs text-qx-text-muted">Moderator</p>
                        )}
                        {isBanned && (
                          <p className="text-xs text-red-500">Banned</p>
                        )}
                      </div>
                      
                      {/* Three-dot menu button */}
                      {canShowActions && (
                        <button
                          ref={dropdown.selectedMember === addr ? dropdownButtonRef : undefined}
                          onClick={(e) => handleOpenDropdown(addr, e)}
                          className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-white transition-colors"
                          aria-label="Member actions"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })
            )}
          </div>

          <p className="text-xs text-qx-text-muted text-center">
            Showing {uniqueSenders.filter((addr) => addr.toLowerCase().includes(memberSearch.toLowerCase())).length} of {activeMemberCount} active members
          </p>
        </div>
      </Modal>

      {/* Dropdown Menu - Portal to body to avoid clipping */}
      {dropdown.isOpen && dropdown.selectedMember && dropdown.position && (
        <div
          ref={dropdownRef}
          className="fixed z-[100] bg-[#0d0d14] border border-gray-800 py-1"
          style={{
            top: dropdown.position.top,
            left: Math.max(8, dropdown.position.left), // Prevent going off-screen on left
          }}
        >
          {/* Send Message - always shown for other users */}
          <button
            onClick={() => handleSendMessage(dropdown.selectedMember!)}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#0991B2]/10 transition-colors"
          >
            Send Message
          </button>
          
          {/* Add Mod - only for creator, only if target is not already mod */}
          {isCreator && !modStatus.get(dropdown.selectedMember!.toLowerCase()) && (
            <button
              onClick={() => handleAddMod(dropdown.selectedMember!)}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#0991B2]/10 transition-colors"
            >
              Add Mod
            </button>
          )}
          
          {/* Remove Mod - only for creator, only if target is mod */}
          {isCreator && modStatus.get(dropdown.selectedMember!.toLowerCase()) && (
            <button
              onClick={() => handleRemoveMod(dropdown.selectedMember!)}
              className="w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-[#0991B2]/10 transition-colors"
            >
              Remove Mod
            </button>
          )}
          
          {/* Ban/Unban - for creator or mod */}
          {(isCreator || isCurrentUserMod) && (
            <button
              onClick={() => handleBan(dropdown.selectedMember!)}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#0991B2]/10 transition-colors"
            >
              {bannedStatus.get(dropdown.selectedMember!.toLowerCase()) ? 'Unban Member' : 'Ban Member'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
