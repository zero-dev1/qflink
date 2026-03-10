import React from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { truncateAddress } from '@/lib/utils'
import { useQFName } from '@/hooks/useQFName'

interface MemberListItemProps {
  addr: string
}

const MemberListItem: React.FC<MemberListItemProps> = ({ addr }) => {
  const { name: qfName } = useQFName(addr)
  return (
    <div key={addr} className="flex items-center gap-2 rounded-md p-2 hover:bg-qx-elevated">
      <Avatar address={addr} size="sm" />
      <span className="text-xs text-qx-text-secondary truncate">
        {qfName ? <span className="text-cyan-600">{qfName}</span> : truncateAddress(addr)}
      </span>
    </div>
  )
}

interface MemberListProps {
  members: string[]
  isOpen: boolean
  onToggle: () => void
}

export const MemberList: React.FC<MemberListProps> = ({ members, isOpen, onToggle }) => {
  return (
    <div className={`border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] transition-all duration-200 ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-3">
        <h4 className="text-sm font-semibold text-qx-text-primary">Members ({members.length})</h4>
        <button onClick={onToggle} className="text-qx-text-muted hover:text-qx-text-primary transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto p-2">
        {members.map((addr) => (
          <MemberListItem key={addr} addr={addr} />
        ))}
      </div>
    </div>
  )
}
