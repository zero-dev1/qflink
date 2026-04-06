// src/components/chat/ChatInput.tsx
import { useState, useEffect, useRef } from 'react';
import { LIMITS } from '@/types/index';
import { hapticTap } from '@/lib/feedback';

type SendPhase = 'idle' | 'signing' | 'sending';

interface ChatInputProps {
  placeholder: string;
  onSend: (content: string) => Promise<boolean> | boolean | void;
  disabled?: boolean;
  isSending?: boolean;
}

export function ChatInput({
  placeholder,
  onSend,
  disabled = false,
  isSending = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<SendPhase>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextRef = useRef<string | null>(null);

  // Sync external isSending → internal phase
  useEffect(() => {
    if (isSending && phase === 'idle') {
      setPhase('signing');
    }
    if (!isSending && phase !== 'idle') {
      setPhase('idle');
      // If we still have pending text and the input is empty, the send failed
      // (success would have cleared pendingTextRef)
      if (pendingTextRef.current && input === '') {
        setInput(pendingTextRef.current);
        pendingTextRef.current = null;
      }
    }
  }, [isSending, phase, input]);

  // Transition from 'signing' to 'sending' after a short delay
  // (the wallet popup has appeared, user is signing)
  useEffect(() => {
    if (phase !== 'signing') return;
    const timer = setTimeout(() => {
      if (phase === 'signing') setPhase('sending');
    }, 2000); // After 2s assume signing prompt is up, show "Sending..."
    return () => clearTimeout(timer);
  }, [phase]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || phase !== 'idle') return;
    hapticTap();
    pendingTextRef.current = trimmed;
    setInput('');
    setPhase('signing');
    // Re-focus input for next message
    inputRef.current?.focus();

    try {
      const result = await onSend(trimmed);
      // If onSend explicitly returns false, restore text
      if (result === false) {
        setInput(pendingTextRef.current || '');
        pendingTextRef.current = null;
      } else {
        pendingTextRef.current = null;
      }
    } catch {
      // Error during send — restore text
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
  const showCharCount = input.length > 200;

  return (
    <div>
      <div className="flex items-center gap-3 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 focus-within:border-cyan-border transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) =>
            setInput(e.target.value.slice(0, LIMITS.MAX_MESSAGE_LENGTH))
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || phase !== 'idle'}
          autoFocus
          className="flex-1 bg-transparent outline-none text-[16px] md:text-body text-text-primary placeholder:text-text-tertiary"
          maxLength={LIMITS.MAX_MESSAGE_LENGTH}
        />

        {/* Send button — three states */}
        {(input.trim().length > 0 || phase !== 'idle') && (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label={
              phase === 'signing'
                ? 'Waiting for signature'
                : phase === 'sending'
                  ? 'Sending message'
                  : 'Send message'
            }
            className="h-10 w-auto md:h-8 rounded-lg flex items-center justify-center gap-1.5 px-2 text-cyan-primary hover:text-cyan-hover transition-colors disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {phase === 'signing' ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
                <span className="text-caption text-text-tertiary hidden sm:inline">
                  Sign
                </span>
              </>
            ) : phase === 'sending' ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
                <span className="text-caption text-text-tertiary hidden sm:inline">
                  Sending
                </span>
              </>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 9H15M15 9L10 4M15 9L10 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {showCharCount && (
        <div className="text-caption text-text-tertiary mt-1 text-right">
          {input.length}/{LIMITS.MAX_MESSAGE_LENGTH}
        </div>
      )}
    </div>
  );
}
