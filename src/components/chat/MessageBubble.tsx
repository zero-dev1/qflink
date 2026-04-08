// src/components/chat/MessageBubble.tsx
// Design System §16.2 — Tx state visualization + badge colors + URL rendering + reply
import { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, ThumbsUp, Copy, ExternalLink } from 'lucide-react';
import { formatMessageTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

// ── URL detection ──
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]])/gi;

function renderContent(content: string) {
  const parts = content.split(URL_REGEX);
  if (parts.length === 1) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-primary hover:text-cyan-hover underline underline-offset-2 decoration-cyan-primary/30 inline-flex items-center gap-0.5 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part.length > 50 ? `${part.slice(0, 48)}…` : part}
            <ExternalLink size={10} className="shrink-0 inline" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export interface MessageBubbleProps {
  sender: string;
  content: string;
  timestamp: number;
  isMine: boolean;
  showSender: boolean;
  senderName?: string;
  senderBadgeColor?: string;
  isEncrypted?: boolean;
  isFailed?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAvatarTap?: (address: string) => void;
  onReply?: () => void;
  replyTo?: { sender: string; content: string } | null;
}

export const MessageBubble = memo(function MessageBubble({
  sender,
  content,
  timestamp,
  isMine,
  showSender,
  senderName,
  senderBadgeColor,
  isEncrypted,
  isFailed,
  onRetry,
  onDismiss,
  onAvatarTap,
  onReply,
  replyTo,
}: MessageBubbleProps) {
  const state = isFailed ? 'failed' : 'sent';
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // ── Long-press / right-click for context menu ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    touchStartPos.current = null;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).catch(() => {});
    setShowMenu(false);
  }, [content]);

  const handleReply = useCallback(() => {
    onReply?.();
    setShowMenu(false);
  }, [onReply]);

  // Badge-tinted name color
  const nameColor = senderBadgeColor || undefined;

  return (
    <div
      className={cn(
        'flex group relative',
        isMine ? 'justify-end' : 'justify-start',
        !showSender ? 'mt-0.5' : 'mt-4'
      )}
    >
      <div className="max-w-[85%] md:max-w-[75%] min-w-0">
        {/* Sender info — tappable avatar, badge-colored name */}
        {showSender && !isMine && (
          <div className="flex items-center gap-2 mb-1">
            <button className="shrink-0 active:scale-[0.96]" aria-label="View profile" onClick={() => onAvatarTap?.(sender)}>
              <Avatar address={sender} size={24} />
            </button>
            <div
              className="text-caption"
              style={nameColor ? { color: nameColor } : undefined}
            >
              {!nameColor && <span className="text-text-tertiary">
                {senderName && senderName.endsWith('.qf') ? (
                  <>
                    {senderName.slice(0, -3)}
                    <span className="text-cyan-primary">.qf</span>
                  </>
                ) : (
                  senderName || `${sender.slice(0, 6)}...${sender.slice(-4)}`
                )}
              </span>}
              {nameColor && (
                senderName && senderName.endsWith('.qf') ? (
                  <>
                    {senderName.slice(0, -3)}
                    <span style={{ color: nameColor, opacity: 0.8 }}>.qf</span>
                  </>
                ) : (
                  senderName || `${sender.slice(0, 6)}...${sender.slice(-4)}`
                )
              )}
            </div>
          </div>
        )}

        {/* Reply quote */}
        {replyTo && (
          <div className="mb-1 ml-1 pl-2 border-l-2 border-cyan-primary/30 rounded-sm">
            <p className="text-[10px] text-text-tertiary truncate max-w-[200px]">
              {replyTo.content}
            </p>
          </div>
        )}

        {/* Message bubble — state-driven + badge-tinted for badge holders */}
        <div
          className={cn(
            'inline-block rounded-2xl px-3.5 py-2',
            'break-words overflow-hidden',
            // Failed state
            state === 'failed' && isMine && 'bg-error/10 border border-error/20',
            // Own messages — solid cyan, white text
            state === 'sent' && isMine && 'bg-cyan-primary text-white',
            // Other's messages — warmer neutral
            !isMine && !senderBadgeColor && 'bg-white/[0.06] border border-white/[0.08]',
          )}
          style={
            !isMine && senderBadgeColor
              ? { backgroundColor: `${senderBadgeColor}10`, borderColor: `${senderBadgeColor}18`, borderWidth: 1, borderStyle: 'solid' }
              : undefined
          }
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
        >
          <p className={cn('text-body', isMine && state === 'sent' ? 'text-white' : 'text-text-primary')} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {renderContent(content)}
          </p>
        </div>

        {/* Status row below bubble */}
        <div className={cn('flex items-center gap-1.5 mt-0.5', isMine ? 'justify-end' : '')}>
          <span className="text-[10px] text-text-tertiary tabular-nums">
            {formatMessageTime(timestamp)}
          </span>

          {state === 'sent' && isMine && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-cyan-primary">
              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

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

          {/* Desktop hover: quick reply */}
          {onReply && !isFailed && (
            <button
              onClick={onReply}
              className="hidden group-hover:flex items-center ml-1 text-text-tertiary hover:text-cyan-primary transition-colors"
              aria-label="Reply"
            >
              <Reply size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Long-press context menu ── */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 bg-surface-3 border border-white/[0.10] rounded-xl shadow-lg py-1 min-w-[140px]',
                isMine ? 'right-0' : 'left-0',
                'bottom-full mb-1'
              )}
            >
              {onReply && (
                <button
                  onClick={handleReply}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors"
                >
                  <Reply size={14} />
                  Reply
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors"
              >
                <Copy size={14} />
                Copy
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
