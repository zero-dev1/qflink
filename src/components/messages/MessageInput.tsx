import React, { useState } from 'react'

const DEFAULT_MAX_LENGTH = 500

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  maxLength?: number
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled, maxLength = DEFAULT_MAX_LENGTH }) => {
  const [text, setText] = useState('')

  const length = text.length
  const isOverLimit = length > maxLength
  
  // Show counter at maxLength - 50 (e.g., 450 for 500 limit)
  // Gray at 450-499, red at 500
  const showThreshold = maxLength - 50
  const showCounter = length >= showThreshold
  const counterColor = isOverLimit ? 'text-qx-error' : 'text-qx-text-muted'

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
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          maxLength={maxLength + 20}
          className={`flex-1 h-10 rounded-lg border bg-gray-50 dark:bg-white/[0.03] px-4 text-sm text-qx-text-primary placeholder:text-qx-text-muted focus:outline-none focus:ring-1 disabled:opacity-50 transition-colors ${
            isOverLimit
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-qx-border-prominent focus:border-cyan-600 focus:ring-cyan-600'
          }`}
        />
        <button
          type="submit"
          disabled={disabled || !text.trim() || isOverLimit}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
