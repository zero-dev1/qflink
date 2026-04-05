// src/components/messages/ConversationRow.tsx
import { formatTimestamp } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadDot } from '@/components/ui/UnreadDot';
import type { ConversationItem } from '@/stores/messages';

interface ConversationRowProps {
  conversation: ConversationItem;
  isActive?: boolean;
  onClick: () => void;
}

export function ConversationRow({ conversation, isActive = false, onClick }: ConversationRowProps) {
  const { address, displayName, lastMessage, lastMessageTime, unreadCount } = conversation;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-left ${
        isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      <Avatar address={address} size={48} />

      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-text-primary truncate">
            {displayName && displayName.endsWith('.qf') ? (
              <>
                {displayName.slice(0, -3)}
                <span className="text-cyan-primary">.qf</span>
              </>
            ) : (
              displayName || `${address.slice(0, 6)}...${address.slice(-4)}` 
            )}
          </p>
          {lastMessageTime > 0 && (
            <span className="text-caption text-text-tertiary shrink-0">
              {formatTimestamp(lastMessageTime)}
            </span>
          )}
        </div>

        {/* Preview row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-body-sm text-text-secondary truncate">
            {lastMessage || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <UnreadDot count={unreadCount} showCount size="sm" />
          )}
        </div>
      </div>
    </button>
  );
}
