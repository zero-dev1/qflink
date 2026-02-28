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
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-l-2 border-b border-b-gray-200 dark:border-b-gray-800 last:border-b-0',
        isActive
          ? 'border-l-cyan-600 bg-gray-100 dark:bg-white/5'
          : 'border-l-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
      )}
    >
      <Avatar address={conversation.address} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-qx-text-primary">
          {conversation.displayName || <span className="font-mono">{truncateAddress(conversation.address)}</span>}
        </p>
        {conversation.lastMessage && (
          <p className="text-xs text-qx-text-secondary truncate mt-0.5">
            {conversation.lastMessage}
          </p>
        )}
        {conversation.lastMessageTime && (
          <p className="text-xs text-qx-text-muted mt-0.5">
            {relativeTime(conversation.lastMessageTime)}
          </p>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-xs font-bold text-white flex-shrink-0">
          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </span>
      )}
    </button>
  )
}
