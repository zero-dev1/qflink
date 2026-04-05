import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useMessagesStore } from '@/stores/messages';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { NewMessageModal } from '@/components/messages/NewMessageModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
  } = useMessagesStore();

  const [showNewMessage, setShowNewMessage] = useState(false);

  useEffect(() => {
    if (isConnected) fetchConversations();
  }, [isConnected, fetchConversations]);

  // Disconnected state
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">
          Connect your wallet to view messages
        </p>
        <Link
          to="/connect"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Connect →
        </Link>
      </div>
    );
  }

  return (
    <>
      {isLoadingConversations ? (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-10 w-28 rounded-default" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className="max-w-content mx-auto px-6 md:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="font-display text-h1 text-text-primary">Messages</h1>
            {/* Desktop new message button in header */}
            <div className="hidden md:block">
              <Button
                variant="secondary"
                onClick={() => setShowNewMessage(true)}
              >
                New message
              </Button>
            </div>
          </div>

          {/* Mobile FAB */}
          <button
            onClick={() => setShowNewMessage(true)}
            className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-cyan-primary text-on-cyan flex items-center justify-center shadow-none active:bg-cyan-pressed transition-colors"
            aria-label="New message"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Conversation list */}
          <div className="mt-6">
            {conversations.length > 0 ? (
              <div className="flex flex-col gap-1">
                {conversations.map((conv) => (
                  <ConversationRow
                    key={conv.address}
                    conversation={conv}
                    onClick={() => navigate(`/dm/${conv.address}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
                <p className="text-body text-text-secondary">No conversations yet</p>
                <p className="mt-2 text-body-sm text-text-tertiary">
                  Start a conversation by sending a message to any .qf name or address
                </p>
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
                >
                  Start a conversation →
                </button>
              </div>
            )}
          </div>

          {/* New message modal */}
          <AnimatePresence>
            {showNewMessage && (
              <NewMessageModal
                onClose={() => setShowNewMessage(false)}
                recentConversations={conversations}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </>
  );
}
