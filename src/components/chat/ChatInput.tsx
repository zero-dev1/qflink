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
  isSending = false 
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
    <div className="px-4 md:px-6 py-3 border-t border-border-subtle shrink-0">
      <div className="flex items-center gap-3 h-12 rounded-md bg-surface-2 border border-border-medium px-4 focus-within:border-cyan-border transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, LIMITS.MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-body text-text-primary placeholder:text-text-tertiary"
          maxLength={LIMITS.MAX_MESSAGE_LENGTH}
        />
        
        {/* Send button */}
        {input.trim().length > 0 && (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="text-cyan-primary hover:text-cyan-hover transition-colors disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="h-4 w-4 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin"></div>
            ) : (
              <span className="text-lg">→</span>
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
