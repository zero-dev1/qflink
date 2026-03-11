import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getProfile } from '@/lib/contractCalls'
import { ConversationItem } from './ConversationItem'
import { Input } from '@/components/ui/Input'
import type { Conversation } from '@/types'

interface ConversationListProps {
  conversations: Conversation[]
  activeAddress: string | null
  onSelect: (address: string) => void
  onNewMessage: () => void
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeAddress,
  onSelect,
  onNewMessage,
}) => {
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map())
  const profilesFetchedRef = useRef<Set<string>>(new Set())

  // Fetch profiles for all conversation addresses
  useEffect(() => {
    const fetchProfiles = async () => {
      const addressesToFetch = conversations
        .map(c => c.address.toLowerCase())
        .filter(addr => !profilesFetchedRef.current.has(addr))
      
      if (addressesToFetch.length === 0) return
      
      const newProfiles = new Map(profileNames)
      
      await Promise.all(addressesToFetch.map(async (addr) => {
        profilesFetchedRef.current.add(addr)
        try {
          const profile = await getProfile(addr as `0x${string}`)
          if (profile?.displayName) {
            newProfiles.set(addr, profile.displayName)
          }
        } catch {}
      }))
      
      setProfileNames(newProfiles)
    }
    
    fetchProfiles()
  }, [conversations])
  return (
    <div className="flex h-full w-full md:w-72 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-qx-text-muted">Direct Messages</p>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewMessage}
            className="flex h-7 w-7 items-center justify-center text-qx-text-secondary hover:bg-qx-elevated hover:text-qx-text-primary transition-colors"
            title="New message"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center text-qx-text-secondary hover:bg-qx-elevated hover:text-qx-text-primary transition-colors md:hidden"
            title="Back"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <p className="text-gray-400 text-sm">
              Tap <span className="text-[#0991B2] font-semibold">+</span> to start a conversation with any .qf name or wallet address
            </p>
          </div>
        ) : (
          conversations.map((convo) => {
            const profileName = profileNames.get(convo.address.toLowerCase())
            return (
              <ConversationItem
                key={convo.address}
                conversation={{
                  ...convo,
                  displayName: profileName || convo.displayName,
                }}
                isActive={convo.address === activeAddress}
                onClick={() => onSelect(convo.address)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
