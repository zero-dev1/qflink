import React, { useState } from 'react'

const DEFAULT_MAX_LENGTH = 280

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  maxLength?: number
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled, maxLength = DEFAULT_MAX_LENGTH }) => {
  const [text, setText] = useState('')

  const length = text.length
  const isOverLimit = length > maxLength
  const isNearLimit = length >= maxLength - 10
  const isApproachingLimit = length >= maxLength - 30

  // For 85-character limit: show counter at 75+, yellow at 75-84, red at 85
  const showCounter = maxLength === 85 ? length >= 75 : isApproachingLimit
  const counterColor = isOverLimit
    ? 'text-red-400'
    : (maxLength === 85 && length >= 75) || isNearLimit
    ? 'text-yellow-500'
    : 'text-qf-text-muted'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isOverLimit) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t border-qf-border-subtle px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          maxLength={maxLength + 20}
          className={`flex-1 h-10 rounded-lg border bg-qf-card px-4 text-sm text-qf-text-primary placeholder:text-qf-text-muted focus:outline-none focus:ring-1 disabled:opacity-50 transition-colors ${
            isOverLimit
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-qf-border-prominent focus:border-qf-accent focus:ring-qf-accent'
          }`}
        />
        <button
          type="submit"
          disabled={disabled || !text.trim() || isOverLimit}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-qf-accent text-black transition-colors hover:bg-qf-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
      {showCounter && (
        <div className="flex justify-end mt-1">
          <span className={`text-xs tabular-nums transition-colors ${counterColor}`}>
            {length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  )
}
