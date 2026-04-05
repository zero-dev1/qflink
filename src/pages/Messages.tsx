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
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
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
    <div className="max-w-content mx-auto px-6 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-text-primary">Messages</h1>
        <Button
          variant="secondary"
          onClick={() => setShowNewMessage(true)}
        >
          New message
        </Button>
      </div>

      {/* Conversation list */}
      <div className="mt-6">
        {isLoadingConversations ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : conversations.length > 0 ? (
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
          <div className="rounded-lg bg-surface-2 border border-border-subtle p-8 text-center">
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
  );
}
