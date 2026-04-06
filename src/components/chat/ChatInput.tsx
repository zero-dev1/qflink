// src/components/chat/ChatInput.tsx
// Design System §16.2 — Signing state: input transforms to "Approve in wallet →"
// Character countdown ring around send button
import { useState, useEffect, useRef } from 'react';
import { LIMITS } from '@/types/index';
import { hapticTap } from '@/lib/feedback';
import { cn } from '@/lib/utils';

type SendPhase = 'idle' | 'signing' | 'sending';

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

  // Sync external isSending → internal phase
  useEffect(() => {
    if (isSending && phase === 'idle') setPhase('signing');
    if (!isSending && phase !== 'idle') {
      setPhase('idle');
      if (pendingTextRef.current && input === '') {
        setInput(pendingTextRef.current);
        pendingTextRef.current = null;
      }
    }
  }, [isSending, phase, input]);

  // Transition signing → sending after delay
  useEffect(() => {
    if (phase !== 'signing') return;
    const timer = setTimeout(() => {
      if (phase === 'signing') setPhase('sending');
    }, 2000);
    return () => clearTimeout(timer);
  }, [phase]);

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
      if (result === false) {
        setInput(pendingTextRef.current || '');
      }
      pendingTextRef.current = null;
    } catch {
      setInput(pendingTextRef.current || '');
      pendingTextRef.current = null;
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
      <div className="flex items-center justify-center h-12 rounded-xl bg-white/[0.03] border border-cyan-border px-4">
        <div className="flex items-center gap-2 text-cyan-primary">
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
          <span className="text-label">Approve in wallet →</span>
        </div>
      </div>
    );
  }

  if (phase === 'sending') {
    return (
      <div className="flex items-center justify-center h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4">
        <div className="flex items-center gap-2 text-text-tertiary">
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
          <span className="text-label">Confirming...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 focus-within:border-cyan-border transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, LIMITS.MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
