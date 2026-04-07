// src/components/chat/MessageBubble.tsx
// Design System §16.2 — Tx state visualization:
// Optimistic: translucent, pulsing border
// Confirming: dot animation under bubble
// Confirmed: full opacity, brief ✓ fades
// Failed: red-tinted, "Failed — tap to retry"
import { memo } from 'react';
import { formatMessageTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  sender: string;
  content: string;
  timestamp: number;
  isMine: boolean;
  showSender: boolean;
  senderName?: string;
  isEncrypted?: boolean;
  isFailed?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAvatarTap?: (address: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  sender,
  content,
  timestamp,
  isMine,
  showSender,
  senderName,
  isEncrypted,
  isFailed,
  onRetry,
  onDismiss,
  onAvatarTap,
}: MessageBubbleProps) {
  const state = isFailed ? 'failed' : 'sent';

  return (
    <div
      className={cn(
        'flex',
        isMine ? 'justify-end' : 'justify-start',
        !showSender ? 'mt-0.5' : 'mt-4'
      )}
    >
      <div className="max-w-[85%] md:max-w-[75%]">
        {/* Sender info — tappable avatar */}
        {showSender && !isMine && (
          <div className="flex items-center gap-2 mb-1">
            <button className="shrink-0 active:scale-[0.96]" aria-label="View profile" onClick={() => onAvatarTap?.(sender)}>
              <Avatar address={sender} size={24} />
            </button>
            <div className="text-caption text-text-tertiary">
              {senderName && senderName.endsWith('.qf') ? (
                <>
                  {senderName.slice(0, -3)}
                  <span className="text-cyan-primary">.qf</span>
                </>
              ) : (
                senderName || `${sender.slice(0, 6)}...${sender.slice(-4)}`
              )}
            </div>
          </div>
        )}

        {/* Message bubble — state-driven styling */}
        <div
          className={cn(
            'inline-block rounded-2xl px-3.5 py-2 max-w-[85%] md:max-w-[70%]',
            // Failed state
            state === 'failed' && isMine && 'bg-error/10 border border-error/20',
            // Normal state
            state === 'sent' && isMine && 'bg-cyan-muted',
            // Other's messages
            !isMine && 'bg-white/[0.04]',
          )}
        >
          <p className="text-body text-text-primary">{content}</p>
        </div>

        {/* Status row below bubble */}
        {showSender && (
          <div className={cn('flex items-center gap-1.5 mt-0.5', isMine ? 'justify-end' : '')}>
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {formatMessageTime(timestamp)}
            </span>

            {/* Confirmed check — always show for own sent messages */}
            {state === 'sent' && isMine && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-cyan-primary">
                <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}

            {/* Failed — retry + dismiss */}
            {state === 'failed' && isMine && (
              <span className="flex items-center gap-2 ml-1">
                {onRetry && (
                  <button onClick={onRetry} className="text-[10px] text-cyan-primary hover:text-cyan-hover">Retry</button>
                )}
                {onDismiss && (
                  <button onClick={onDismiss} className="text-[10px] text-error hover:text-error/80">Dismiss</button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
