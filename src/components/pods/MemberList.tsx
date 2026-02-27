import React from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { truncateAddress } from '@/lib/utils'

interface MemberListProps {
  members: string[]
  isOpen: boolean
  onToggle: () => void
}

export const MemberList: React.FC<MemberListProps> = ({ members, isOpen, onToggle }) => {
  return (
    <div className={`border-l border-qf-border-subtle bg-qf-bg transition-all duration-200 ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
      <div className="flex items-center justify-between border-b border-qf-border-subtle p-3">
        <h4 className="text-sm font-semibold text-qf-text-primary">Members ({members.length})</h4>
        <button onClick={onToggle} className="text-qf-text-muted hover:text-qf-text-primary transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto p-2">
        {members.map((addr) => (
          <div key={addr} className="flex items-center gap-2 rounded-md p-2 hover:bg-qf-elevated">
            <Avatar address={addr} size="sm" />
            <span className="text-xs text-qf-text-secondary truncate">{truncateAddress(addr)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
