// src/components/messages/ConversationRow.tsx
// Design System §16.1 — avatar (badge ring), .qf split render, preview, timestamp, lock indicator, unread dot
import { memo } from 'react';
import { Lock } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { useUnreadStore } from '@/stores/unread';
import type { ConversationItem } from '@/stores/messages';

interface ConversationRowProps {
  conversation: ConversationItem;
  isActive?: boolean;
  onClick: () => void;
  onAvatarTap?: (address: string) => void;
}

export const ConversationRow = memo(function ConversationRow({ conversation, isActive = false, onClick, onAvatarTap }: ConversationRowProps) {
  const { address, displayName, lastMessage, lastMessageTime, unreadCount } = conversation;
  const hasUnread = useUnreadStore((s) => s.hasDMUnread(address));
  const dmUnreadCount = useUnreadStore((s) => s.getDMUnreadCount(address));

  // Detect encrypted message in preview
  const isEncryptedPreview = lastMessage?.startsWith('enc:') || lastMessage?.startsWith('[Encrypted');
  const previewText = isEncryptedPreview ? 'Encrypted message' : (lastMessage || 'No messages yet');

  return (
    <button
      onClick={onClick}
      aria-label={`Conversation with ${displayName || `${address.slice(0, 6)}...${address.slice(-4)}`}${hasUnread ? ', unread messages' : ''}`}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-left active:scale-[0.98] ${
        isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* §11 — Avatar with badge ring, tappable → profile sheet */}
      <div
        className="relative shrink-0"
        role="button"
        aria-label={`View ${displayName || 'user'} profile`}
        onClick={(e) => { e.stopPropagation(); onAvatarTap?.(address); }}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-border active:scale-[0.96] transition-transform">
          <Avatar address={address} size={48} className="w-full h-full" />
        </div>
      </div>

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
          <div className="flex items-center gap-2 shrink-0">
            {isEncryptedPreview && <Lock size={11} className="text-text-tertiary" strokeWidth={1.5} />}
            {lastMessageTime > 0 && (
              <span className="text-caption text-text-tertiary">
                {formatTimestamp(lastMessageTime)}
              </span>
            )}
          </div>
        </div>

        {/* Preview row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-body-sm text-text-secondary truncate">
            {previewText}
          </p>
          {(hasUnread || dmUnreadCount > 0) && (
            <UnreadDot count={dmUnreadCount || 1} showCount={dmUnreadCount > 0} size="sm" />
          )}
        </div>
      </div>
    </button>
  );
});
