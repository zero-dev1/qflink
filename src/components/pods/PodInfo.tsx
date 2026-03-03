import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { registryGetProfile, banMember, unbanMember, addMod, removeMod, getMods, isBanned, isMod } from '@/lib/contracts'
import { getApi } from '@/lib/chain'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import type { Pod, DefaultPod, CustomPod, PodMessage } from '@/types'

interface PodInfoProps {
  pod: Pod
  members: string[]
  messages: PodMessage[]  // Added to extract unique senders
  currentUserAddress: string
  userBalance: bigint
  onInvite?: () => void
  onLeave?: () => void
}

interface MemberInfo {
  address: string
  name: string | null
}

type ModalView = 'list' | 'actions' | 'confirm'
type ActionType = 'ban' | 'unban' | 'addMod' | 'removeMod' | 'message' | 'profile'

export const PodInfo: React.FC<PodInfoProps> = ({
  pod,
  members,
  messages,
  currentUserAddress,
  userBalance,
  onInvite,
  onLeave,
}) => {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  // ISSUE 1 FIX: Get H160 address from wallet store for proper comparison
  const currentUserH160 = useWalletStore((s) => s.evmAddress)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberProfiles, setMemberProfiles] = useState<Map<string, string>>(new Map())
  const [modalView, setModalView] = useState<ModalView>('list')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [moderators, setModerators] = useState<string[]>([])
  const [bannedStatus, setBannedStatus] = useState<Map<string, boolean>>(new Map())
  const [modStatus, setModStatus] = useState<Map<string, boolean>>(new Map())
  const isLoadingMods = React.useRef(false)
  const isLoadingStatus = React.useRef(false)
  const profilesFetchedRef = React.useRef<Set<string>>(new Set())

  const isDefault = (pod as DefaultPod).isDefault === true
  const isCustom = !isDefault
  const customPod = isCustom ? (pod as CustomPod) : null

  // Extract unique sender addresses from messages
  const uniqueSenders = React.useMemo(() => {
    const senders = new Set<string>()
    messages.forEach(msg => senders.add(msg.sender))
    return Array.from(senders)
  }, [messages])

  const activeMemberCount = uniqueSenders.length

  // Lookup profile names for unique senders
  useEffect(() => {
    let cancelled = false
    const lookupProfiles = async () => {
      const toFetch = uniqueSenders.filter(addr => !profilesFetchedRef.current.has(addr))
      if (toFetch.length === 0) return
      
      const api = await getApi()
      const profiles = new Map<string, string>(memberProfiles)
      
      await Promise.all(
        toFetch.map(async (addr) => {
          profilesFetchedRef.current.add(addr)
          try {
            const profile = await registryGetProfile(api, addr)
            if (profile && profile.displayName) {
              profiles.set(addr, profile.displayName)
            }
          } catch {
            // Ignore lookup errors
          }
        })
      )
      
      if (!cancelled) setMemberProfiles(profiles)
    }
    
    lookupProfiles()
    return () => { cancelled = true }
  }, [uniqueSenders.length])

  const filteredMembers = uniqueSenders.filter((addr) =>
    addr.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const minBalance = (pod as DefaultPod).minBalance ?? BigInt(0)
  
  // ISSUE 1 FIX: Use H160 addresses for comparison (not SS58)
  const normalizedCurrentUserH160 = currentUserH160?.toLowerCase() || ''
  const normalizedCreator = customPod?.creator?.toLowerCase() || ''
  const isCreator = isCustom && normalizedCreator === normalizedCurrentUserH160
  const isCurrentUserMod = modStatus.get(normalizedCurrentUserH160) || false
  
  // Fetch moderators list
  // ISSUE 2 FIX: Only run once when pod changes, not on every render
  useEffect(() => {
    if (!isCustom || !customPod) return
    if (isLoadingMods.current) return
    let cancelled = false
    const fetchMods = async () => {
      isLoadingMods.current = true
      try {
        const mods = await getMods(pod.id)
        if (!cancelled) setModerators(mods.map(m => m.toLowerCase()))
      } catch (err) {
        console.error('[PodInfo] Failed to fetch mods:', err)
        if (!cancelled) setModerators([])
      } finally {
        isLoadingMods.current = false
      }
    }
    fetchMods()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod.id])

  // Check ban and mod status for members
  // ISSUE 2 FIX: Use stable reference for uniqueSenders to prevent infinite loop
  useEffect(() => {
    if (!isCustom || !customPod || uniqueSenders.length === 0 || !currentUserH160) return
    if (isLoadingStatus.current) return
    let cancelled = false
    const checkStatus = async () => {
      isLoadingStatus.current = true
      const banned = new Map<string, boolean>()
      const mods = new Map<string, boolean>()
      
      try {
        await Promise.all(
          uniqueSenders.map(async (addr) => {
            const [isBannedStatus, isModStatus] = await Promise.all([
              isBanned(pod.id, addr),
              isMod(pod.id, addr)
            ])
            banned.set(addr.toLowerCase(), isBannedStatus)
            mods.set(addr.toLowerCase(), isModStatus)
          })
        )
        
        if (!cancelled) {
          setBannedStatus(banned)
          setModStatus(mods)
        }
      } catch (err) {
        console.error('[PodInfo] Failed to check member status:', err)
      } finally {
        isLoadingStatus.current = false
      }
    }
    checkStatus()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod.id, uniqueSenders.length, currentUserH160])

  const handleMemberClick = (addr: string) => {
    // ISSUE 1 FIX: Compare H160 addresses
    if (addr.toLowerCase() === currentUserH160?.toLowerCase()) return
    setSelectedMember(addr)
    setModalView('actions')
  }

  const handleBackToList = () => {
    setModalView('list')
    setSelectedMember(null)
    setPendingAction(null)
  }

  const handleActionClick = (action: ActionType) => {
    if (action === 'message') {
      // BUG 3 FIX: Navigate to correct DM route
      navigate(`/direct/${selectedMember}`)
      setShowMembersModal(false)
      handleBackToList()
    } else if (action === 'profile') {
      addToast('info', 'Profile view coming soon')
    } else {
      setPendingAction(action)
      setModalView('confirm')
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedMember || !pendingAction) return
    
    setIsActionLoading(true)
    try {
      switch (pendingAction) {
        case 'ban':
          await banMember(pod.id, selectedMember)
          addToast('success', 'Member banned')
          break
        case 'unban':
          await unbanMember(pod.id, selectedMember)
          addToast('success', 'Member unbanned')
          break
        case 'addMod':
          await addMod(pod.id, selectedMember)
          addToast('success', 'Moderator added')
          break
        case 'removeMod':
          await removeMod(pod.id, selectedMember)
          addToast('success', 'Moderator removed')
          break
      }
      
      // Refresh status
      const [isBannedStatus, isModStatus] = await Promise.all([
        isBanned(pod.id, selectedMember),
        isMod(pod.id, selectedMember)
      ])
      setBannedStatus(prev => new Map(prev).set(selectedMember.toLowerCase(), isBannedStatus))
      setModStatus(prev => new Map(prev).set(selectedMember.toLowerCase(), isModStatus))
      
      if (pendingAction === 'addMod' || pendingAction === 'removeMod') {
        const mods = await getMods(pod.id)
        setModerators(mods.map(m => m.toLowerCase()))
      }
      
      handleBackToList()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setModalView('actions')
  }

  const handleCloseModal = () => {
    setShowMembersModal(false)
    setMemberSearch('')
    handleBackToList()
  }

  return (
    <>
      <div className="hidden md:flex w-56 flex-shrink-0 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] overflow-y-auto">
        {/* POD INFO header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-qx-text-muted">Pod Info</p>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4">
          {/* About */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-1">About</h4>
            <p className="text-xs text-qx-text-secondary leading-relaxed">{pod.description}</p>
          </div>

          {/* Requirements (default pods) */}
          {isDefault && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-1">Requirements</h4>
              <p className="text-xs text-qx-text-secondary">
                Requires {formatBalance(minBalance)} QF aggregated balance
              </p>
            </div>
          )}

          {/* Requirements (custom pods) */}
          {isCustom && customPod && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-1">Requirements</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-qx-text-muted">Tier</span>
                  <span className="capitalize font-medium text-qx-text-primary">{customPod.tier}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-qx-text-muted">Join Method</span>
                  <span className="capitalize font-medium text-qx-text-primary">
                    {customPod.joinMethod === 'balance' ? 'Balance-Based' : 'Invite-Only'}
                  </span>
                </div>
                {customPod.minBalance !== undefined && customPod.minBalance > 0n && (
                  <div className="flex justify-between text-xs">
                    <span className="text-qx-text-muted">Min Balance</span>
                    <span className="font-medium text-cyan-600">{formatBalance(customPod.minBalance)} QF</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h4 className="text-sm font-semibold text-qx-text-primary mb-1">Members</h4>
            <p className="text-xs text-qx-text-secondary">
              Open to qualified holders
              {activeMemberCount > 0 && (
                <span className="ml-1 text-cyan-600">({activeMemberCount} active)</span>
              )}
            </p>
          </div>

          {/* Moderators */}
          {isCustom && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-1">Moderators</h4>
              {moderators.length === 0 ? (
                <p className="text-xs text-qx-text-muted">No moderators</p>
              ) : (
                <div className="space-y-1">
                  {moderators.map((modAddr) => {
                    const profileName = memberProfiles.get(modAddr)
                    return (
                      <p key={modAddr} className="text-xs text-qx-text-secondary">
                        {profileName || truncateAddress(modAddr, 'evm', 6)}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* BUG 6 FIX: Banned Users visible to creator and moderators */}
          {isCustom && (isCreator || isCurrentUserMod) && (
            <div>
              <h4 className="text-sm font-semibold text-qx-text-primary mb-1">Banned Users</h4>
              {Array.from(bannedStatus.entries()).filter(([_, isBanned]) => isBanned).length === 0 ? (
                <p className="text-xs text-qx-text-muted">No banned users</p>
              ) : (
                <div className="space-y-1">
                  {Array.from(bannedStatus.entries())
                    .filter(([_, isBanned]) => isBanned)
                    .map(([addr, _]) => {
                      const profileName = memberProfiles.get(addr)
                      return (
                        <div key={addr} className="flex items-center justify-between">
                          <p className="text-xs text-qx-text-secondary">
                            {profileName || truncateAddress(addr, 'evm', 6)}
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                await unbanMember(pod.id, addr)
                                addToast('success', 'Member unbanned')
                                const isBannedStatus = await isBanned(pod.id, addr)
                                setBannedStatus(prev => new Map(prev).set(addr.toLowerCase(), isBannedStatus))
                              } catch (err) {
                                addToast('error', err instanceof Error ? err.message : 'Failed to unban')
                              }
                            }}
                            className="text-xs text-cyan-600 hover:text-cyan-500 transition-colors"
                          >
                            Unban
                          </button>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 space-y-2">
          {onInvite && (
            <button
              onClick={onInvite}
              className="flex w-full items-center justify-center gap-2 border border-qx-border-prominent px-3 py-2 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Invite Link
            </button>
          )}

          <button
            onClick={() => setShowMembersModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-qx-border-prominent px-3 py-2 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            View Members
          </button>

          {onLeave && (
            <button
              onClick={onLeave}
              className="flex w-full items-center justify-center gap-2 border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave Pod
            </button>
          )}
        </div>
      </div>

      {/* View Members Modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={handleCloseModal}
        title={modalView === 'list' ? `${pod.name} Members (${activeMemberCount} active)` : 'Member Actions'}
      >
        {modalView === 'list' && (
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
              {filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-qx-text-muted">No active members yet.</p>
                </div>
              ) : (
                filteredMembers.map((addr) => {
                  const profileName = memberProfiles.get(addr)
                  // ISSUE 1 FIX: Compare H160 addresses for "You" indicator
                  const isCurrentUser = addr.toLowerCase() === currentUserH160?.toLowerCase()
                  return (
                    <div key={addr} className="flex items-center gap-3 px-3 py-2.5 hover:bg-qx-elevated">
                      <Avatar address={addr} size="sm" />
                      <div className="flex-1 min-w-0">
                        {profileName ? (
                          <p className="text-sm font-medium text-qx-text-primary truncate">
                            {profileName}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-qx-text-primary font-mono">
                            {truncateAddress(addr, 'evm', 8)}
                          </p>
                        )}
                        {isCurrentUser && (
                          <p className="text-xs text-cyan-600">You</p>
                        )}
                      </div>
                      {/* BUG 2 FIX: Only show three-dot menu if NOT current user */}
                      {!isCurrentUser && (
                        <button
                          onClick={() => handleMemberClick(addr)}
                          className="flex h-8 w-8 items-center justify-center text-qx-text-muted hover:text-qx-text-primary hover:bg-qx-elevated transition-colors"
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
              Showing {filteredMembers.length} of {activeMemberCount} active members
            </p>
          </div>
        )}

        {modalView === 'actions' && selectedMember && (
          <div className="space-y-4">
            {/* BUG 4 FIX: Background matches modal (no extra bg class needed) */}
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-sm text-qx-text-secondary hover:text-qx-text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to members
            </button>

            <div className="flex flex-col items-center gap-3 py-4">
              <Avatar address={selectedMember} size="lg" />
              <div className="text-center">
                <p className="text-sm font-medium text-qx-text-primary">
                  {memberProfiles.get(selectedMember) || truncateAddress(selectedMember, 'evm', 8)}
                </p>
                <p className="text-xs text-qx-text-muted font-mono">{truncateAddress(selectedMember, 'evm', 6)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {isCreator && (
                <button
                  onClick={() => handleActionClick(modStatus.get(selectedMember.toLowerCase()) ? 'removeMod' : 'addMod')}
                  className="w-full bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
                >
                  {modStatus.get(selectedMember.toLowerCase()) ? 'Remove Moderator' : 'Make Moderator'}
                </button>
              )}

              {(isCreator || isCurrentUserMod) && (
                <button
                  onClick={() => handleActionClick(bannedStatus.get(selectedMember.toLowerCase()) ? 'unban' : 'ban')}
                  className="w-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  {bannedStatus.get(selectedMember.toLowerCase()) ? 'Unban Member' : 'Ban from Pod'}
                </button>
              )}

              {/* BUG 5 FIX: Explicit bg-gray-800 for secondary actions */}
              <button
                onClick={() => handleActionClick('message')}
                className="w-full bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                Send Message
              </button>

              <button
                onClick={() => handleActionClick('profile')}
                className="w-full bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                View Profile
              </button>
            </div>
          </div>
        )}

        {modalView === 'confirm' && selectedMember && pendingAction && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-qx-text-primary mb-2">
                {pendingAction === 'ban' && `Ban ${memberProfiles.get(selectedMember) || truncateAddress(selectedMember, 'evm', 6)} from ${pod.name}?`}
                {pendingAction === 'unban' && `Unban ${memberProfiles.get(selectedMember) || truncateAddress(selectedMember, 'evm', 6)} from ${pod.name}?`}
                {pendingAction === 'addMod' && `Make ${memberProfiles.get(selectedMember) || truncateAddress(selectedMember, 'evm', 6)} a moderator of ${pod.name}?`}
                {pendingAction === 'removeMod' && `Remove ${memberProfiles.get(selectedMember) || truncateAddress(selectedMember, 'evm', 6)} as moderator of ${pod.name}?`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelAction}
                disabled={isActionLoading}
                className="flex-1 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isActionLoading}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  pendingAction === 'ban' || pendingAction === 'unban' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                {isActionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
