import React from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { truncateAddress, cn } from '@/lib/utils'
import type { Conversation } from '@/types'

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-l-2',
        isActive
          ? 'border-l-qf-accent bg-qf-active-bg'
          : 'border-l-transparent hover:bg-qf-elevated'
      )}
    >
      <Avatar address={conversation.address} size="md" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-qf-active-text' : 'text-qf-text-primary')}>
          {conversation.displayName || truncateAddress(conversation.address)}
        </p>
        {conversation.lastMessage && (
          <p className="text-xs text-qf-text-secondary truncate mt-0.5">
            {conversation.lastMessage}
          </p>
        )}
        {conversation.lastMessageTime && (
          <p className="text-xs text-qf-text-muted mt-0.5">
            {relativeTime(conversation.lastMessageTime)}
          </p>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-qf-accent px-1 text-xs font-bold text-black flex-shrink-0">
          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </span>
      )}
    </button>
  )
}
