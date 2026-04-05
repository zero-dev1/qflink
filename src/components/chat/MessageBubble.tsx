import { formatMessageTime } from '@/lib/utils';

interface MessageBubbleProps {
  sender: string;
  content: string;
  timestamp: number;
  isMine: boolean;
  showSender: boolean;
  senderName?: string;
}

export function MessageBubble({ 
  sender, 
  content, 
  timestamp, 
  isMine, 
  showSender, 
  senderName 
}: MessageBubbleProps) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${!showSender ? 'mt-0.5' : 'mt-4'}`}>
      <div className={`max-w-[75%] md:max-w-[85%]`}>
        {/* Show sender info for their messages */}
        {showSender && !isMine && (
          <div className="flex items-center gap-2 mb-1">
            {/* Avatar placeholder - 24px */}
            <div className="w-6 h-6 bg-surface-3 rounded-full flex-shrink-0"></div>
            <div className="text-caption text-text-tertiary">
              {senderName && senderName.endsWith('.qf') ? (
                <>
                  {senderName.slice(0, -3)}
                  <span className="text-cyan-primary">.qf</span>
                </>
              ) : (
                senderName || `${sender.slice(0, 6)}...${sender.slice(-4)}`
              )}
            </div>
          </div>
        )}
        
        {/* Message content */}
        <div className={isMine ? 'bg-cyan-muted rounded-lg px-3 py-2' : ''}>
          <p className="text-body text-text-primary">{content}</p>
        </div>
        
        {/* Timestamp */}
        {showSender && (
          <div className="text-caption text-text-tertiary mt-0.5">
            {formatMessageTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}
