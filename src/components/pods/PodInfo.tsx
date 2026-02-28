import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { registryGetProfile } from '@/lib/contracts'
import { getApi } from '@/lib/chain'
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

export const PodInfo: React.FC<PodInfoProps> = ({
  pod,
  members,
  messages,
  currentUserAddress,
  userBalance,
  onInvite,
  onLeave,
}) => {
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberProfiles, setMemberProfiles] = useState<Map<string, string>>(new Map())

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
    const lookupProfiles = async () => {
      if (uniqueSenders.length === 0) return
      
      const api = await getApi()
      const profiles = new Map<string, string>()
      
      await Promise.all(
        uniqueSenders.map(async (addr) => {
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
      
      setMemberProfiles(profiles)
    }
    
    lookupProfiles()
  }, [uniqueSenders])

  const filteredMembers = uniqueSenders.filter((addr) =>
    addr.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const minBalance = (pod as DefaultPod).minBalance ?? BigInt(0)

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
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 space-y-2">
          {onInvite && (
            <button
              onClick={onInvite}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-qx-border-prominent px-3 py-2 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-elevated"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/60"
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
        onClose={() => { setShowMembersModal(false); setMemberSearch('') }}
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
              className="w-full rounded-md border border-qx-border-prominent bg-qx-elevated pl-8 pr-3 py-2 text-sm text-qx-text-primary placeholder:text-qx-text-muted focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800">
            {filteredMembers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-qx-text-muted">No active members yet.</p>
              </div>
            ) : (
              filteredMembers.map((addr) => {
                const profileName = memberProfiles.get(addr)
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
                      {addr === currentUserAddress && (
                        <p className="text-xs text-cyan-600">You</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <p className="text-xs text-qx-text-muted text-center">
            Showing {filteredMembers.length} of {activeMemberCount} active members
          </p>
        </div>
      </Modal>
    </>
  )
}
