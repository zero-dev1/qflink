import { motion } from 'framer-motion';
import { formatMessageTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

interface MessageBubbleProps {
  sender: string;
  content: string;
  timestamp: number;
  isMine: boolean;
  showSender: boolean;
  senderName?: string;
  isOptimistic?: boolean;
}

export function MessageBubble({
  sender,
  content,
  timestamp,
  isMine,
  showSender,
  senderName,
  isOptimistic = false,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{
        opacity: isOptimistic ? 0.7 : 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        opacity: { duration: 0.2 },
      }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${!showSender ? 'mt-0.5' : 'mt-4'}`}
    >
      <div className="max-w-[85%] md:max-w-[75%]">
        {/* Sender info for their messages */}
        {showSender && !isMine && (
          <div className="flex items-center gap-2 mb-1">
            <Avatar address={sender} size={24} />
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
          <div className={`text-caption text-text-tertiary mt-0.5 ${isMine ? 'text-right' : ''}`}>
            {formatMessageTime(timestamp)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
