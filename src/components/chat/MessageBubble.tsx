// src/components/chat/MessageBubble.tsx
// Design System §16.2 — Tx state visualization:
// Optimistic: translucent, pulsing border
// Confirming: dot animation under bubble
// Confirmed: full opacity, brief ✓ fades
// Failed: red-tinted, "Failed — tap to retry"
import { motion } from 'framer-motion';
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
  isOptimistic?: boolean;
  isEncrypted?: boolean;
  isFailed?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAvatarTap?: (address: string) => void;
}

export function MessageBubble({
  sender,
  content,
  timestamp,
  isMine,
  showSender,
  senderName,
  isOptimistic = false,
  isEncrypted,
  isFailed,
  onRetry,
  onDismiss,
  onAvatarTap,
}: MessageBubbleProps) {
  // Determine tx state
  const state = isFailed ? 'failed' : isOptimistic ? 'optimistic' : 'confirmed';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
            'rounded-lg px-3 py-2 transition-all',
            // Failed state — red tinted
            state === 'failed' && isMine && 'bg-error/10 border border-error/20',
            // Optimistic state — translucent with pulsing border
            state === 'optimistic' && isMine && 'bg-cyan-muted/50 border border-cyan-border animate-border-pulse opacity-60',
            // Confirmed state — full opacity
            state === 'confirmed' && isMine && 'bg-cyan-muted',
            // Other's messages
            !isMine && 'bg-white/[0.03]',
          )}
        >
          <p className="text-body text-text-primary">{content}</p>
        </div>

        {/* Status row below bubble */}
        {showSender && (
          <div className={cn('flex items-center gap-1.5 mt-0.5', isMine ? 'justify-end' : '')}>
            <span className="text-caption text-text-tertiary">
              {formatMessageTime(timestamp)}
            </span>

            {/* Optimistic — confirming dots */}
            {state === 'optimistic' && isMine && (
              <span className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-cyan-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-primary animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-primary animate-pulse" style={{ animationDelay: '400ms' }} />
              </span>
            )}

            {/* Confirmed — check mark */}
            {state === 'confirmed' && isMine && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-cyan-primary">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}

            {/* Failed — red text + retry */}
            {state === 'failed' && isMine && (
              <div className="flex items-center gap-2">
                <span className="text-caption text-error">Failed</span>
                {onRetry && (
                  <button onClick={onRetry} aria-label="Retry sending message" className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors">
                    tap to retry
                  </button>
                )}
                {onDismiss && (
                  <button onClick={onDismiss} aria-label="Dismiss failed message" className="text-caption text-text-tertiary hover:text-text-secondary transition-colors">
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
