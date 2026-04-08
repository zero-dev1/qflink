// src/components/chat/ChatInput.tsx
// Design System §16.2 — Signing state: input transforms to "Approve in wallet →"
// Character countdown ring around send button
import { useState, useEffect, useRef } from 'react';
import { LIMITS } from '@/types/index';
import { hapticTap } from '@/lib/feedback';
import { cn } from '@/lib/utils';

type SendPhase = 'idle' | 'signing' | 'sending';

const PLACEHOLDER_CYCLE = [
  'Say something...',
  'Share an idea...',
  'Ask a question...',
  'Start a conversation...',
];

interface ChatInputProps {
  placeholder: string;
  onSend: (content: string) => Promise<boolean> | boolean | void;
  disabled?: boolean;
  isSending?: boolean;
}

export function ChatInput({ placeholder, onSend, disabled = false, isSending = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<SendPhase>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextRef = useRef<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  // Animated placeholder cycle — only when input is empty
  useEffect(() => {
    if (input.length > 0 || phase !== 'idle') return;
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_CYCLE.length);
        setPlaceholderFade(true);
      }, 200);
    }, 3500);
    return () => clearInterval(interval);
  }, [input, phase]);

  // Sync external isSending → internal phase
useEffect(() => {
  if (isSending && phase === 'idle') setPhase('signing');
  if (!isSending && phase !== 'idle') {
    // isSending went false — broadcast received or error.
    // Reset to idle immediately so user can type next message.
    setPhase('idle');
    pendingTextRef.current = null;
  }
}, [isSending, phase]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || phase !== 'idle') return;
    hapticTap();
    pendingTextRef.current = trimmed;
    setInput('');
    setPhase('signing');
    inputRef.current?.focus();

    try {
      const result = await onSend(trimmed);
      // onSend now returns at broadcast (fast) — phase will be reset by isSending effect
      if (result === false) {
        setInput(pendingTextRef.current || '');
        setPhase('idle');
      }
      pendingTextRef.current = null;
    } catch {
      setInput(pendingTextRef.current || '');
      pendingTextRef.current = null;
      setPhase('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !disabled && phase === 'idle';
  const charProgress = input.length / LIMITS.MAX_MESSAGE_LENGTH;

  // §16.2 — Signing state: input transforms to "Approve in wallet →"
  if (phase === 'signing') {
    return (
      <div className="flex items-center justify-center h-12 px-4">
        <div className="flex items-center gap-2 text-cyan-primary">
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
          <span className="text-label">Approve in wallet →</span>
        </div>
      </div>
    );
  }

  if (phase === 'sending') {
    return (
      <div className="flex items-center justify-center h-12 px-4">
        <div className="flex items-center gap-2 text-text-tertiary">
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
          <span className="text-label">Confirming...</span>
        </div>
      </div>
    );
  }

  // Determine which placeholder to show — animated cycle when empty, prop when replying
  const activePlaceholder = input.length === 0 && !placeholder.startsWith('Reply')
    ? PLACEHOLDER_CYCLE[placeholderIdx]
    : placeholder;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-white/[0.06] bg-white/[0.03] focus-within:border-cyan-primary/30 transition-colors">
        {/* Custom animated placeholder overlay */}
        {input.length === 0 && !placeholder.startsWith('Reply') && (
          <span
            className={cn(
              'absolute left-4 text-[16px] md:text-body text-text-tertiary pointer-events-none select-none transition-opacity duration-200',
              placeholderFade ? 'opacity-100' : 'opacity-0'
            )}
          >
            {PLACEHOLDER_CYCLE[placeholderIdx]}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, LIMITS.MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={input.length === 0 && !placeholder.startsWith('Reply') ? '' : activePlaceholder}
          disabled={disabled}
          autoFocus
          className="flex-1 bg-transparent outline-none text-[16px] md:text-body text-text-primary placeholder:text-text-tertiary"
          maxLength={LIMITS.MAX_MESSAGE_LENGTH}
        />

        {/* Send button with character countdown ring */}
        {input.trim().length > 0 && (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-[0.96]"
          >
            {/* Character countdown ring */}
            {charProgress > 0.5 && (
              <svg className="absolute inset-0 -rotate-90" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
                <circle
                  cx="16" cy="16" r="14"
                  stroke={charProgress > 0.9 ? '#EF4444' : '#06B6D4'}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${charProgress * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
            )}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={cn(canSend ? 'text-cyan-primary' : 'text-text-tertiary')}>
              <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
