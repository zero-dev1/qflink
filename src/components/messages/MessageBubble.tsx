import React from 'react'
import { formatMessageTime, cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isSent: boolean
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => {
  const content = message.decryptedContent || 'Encrypted message'

  return (
    <div className={cn('flex flex-col mb-3', isSent ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-bubble px-4 py-2.5',
          isSent
            ? 'bg-cyan-600 text-white'
            : 'bg-qx-msg-other text-qx-msg-other-text'
        )}
      >
        <p className="text-sm break-words leading-relaxed">{content}</p>
      </div>
      <p className="text-xs text-qx-text-muted mt-1 px-1">
        {formatMessageTime(message.timestamp)}
      </p>
    </div>
  )
}
