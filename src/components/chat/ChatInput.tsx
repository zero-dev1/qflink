// src/components/chat/ChatInput.tsx
import { useState } from 'react';
import { LIMITS } from '@/types/index';

interface ChatInputProps {
  placeholder: string;
  onSend: (content: string) => void;
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

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isSending) {
      onSend(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !disabled && !isSending;
  const showCharCount = input.length > 200;

  return (
    <div>
      <div className="flex items-center gap-3 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 focus-within:border-cyan-border transition-colors">
        <input
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

        {/* Send button */}
        {input.trim().length > 0 && (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center text-cyan-primary hover:text-cyan-hover transition-colors disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Character count */}
      {showCharCount && (
        <div className="text-caption text-text-tertiary mt-1 text-right">
          {input.length}/{LIMITS.MAX_MESSAGE_LENGTH}
        </div>
      )}
    </div>
  );
}
