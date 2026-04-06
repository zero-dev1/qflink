// src/components/chat/MessageBubble.tsx
import { motion } from 'framer-motion';
import { formatMessageTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

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
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{
        opacity: isOptimistic && !isFailed ? 0.55 : 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        // When transitioning from optimistic to confirmed, use a smooth ease
        opacity: isOptimistic
          ? { duration: 0.15 }
          : { type: 'spring', stiffness: 200, damping: 20 },
      }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
        !showSender ? 'mt-0.5' : 'mt-4'
      }`}
    >
      <div className="max-w-[85%] md:max-w-[75%]">
        {/* Sender info */}
        {showSender && !isMine && (
          <div className="flex items-center gap-2 mb-1">
            <Avatar address={sender} size={24} />
            <div className="text-caption text-text-tertiary">
              {senderName && senderName.endsWith('.qf') ? (
                <>
                  {senderName.slice(0, -3)}
                  <span className="text-cyan-primary">.qf</span>
                </>
              ) : (
                senderName ||
                `${sender.slice(0, 6)}...${sender.slice(-4)}` 
              )}
            </div>
          </div>
        )}

        {/* Message content */}
        <div
          className={`${
            isMine
              ? isFailed
                ? 'bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2'
                : 'bg-cyan-muted rounded-lg px-3 py-2'
              : ''
          } ${isOptimistic && isMine && !isFailed ? 'animate-pulse' : ''}`}
        >
          <p className="text-body text-text-primary">{content}</p>
        </div>

        {/* Timestamp + status */}
        {showSender && (
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${
              isMine ? 'justify-end' : ''
            }`}
          >
            <span className="text-caption text-text-tertiary">
              {formatMessageTime(timestamp)}
            </span>
            {isOptimistic && isMine && !isFailed && (
              <span
                className="text-caption text-text-tertiary flex items-center gap-1"
                title="Confirming on-chain..."
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="inline animate-spin"
                >
                  <circle
                    cx="6"
                    cy="6"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="14 14"
                  />
                </svg>
              </span>
            )}
            {isFailed && isMine && (
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <span className="text-caption text-error">Failed</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors"
                  >
                    Retry
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-caption text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
            {!isOptimistic && isMine && !isFailed && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-cyan-primary"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
