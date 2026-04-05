import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePodsStore } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { useUnreadStore } from '@/stores/unread';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export default function PodChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, evmAddress } = useWalletStore();
  const { 
    getPodById, 
    messages, 
    isLoadingMessages, 
    messageFetchErrors,
    isSending, 
    fetchMessages, 
    fetchPods, 
    sendMessage,
    isUserMember 
  } = usePodsStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const podId = id ? Number(id) : null;
  const pod = podId !== null ? getPodById(podId) : null;
  const podMessages = podId !== null ? messages[podId] || [] : [];

  // Check if user is scrolled to bottom
  const checkIsAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Track scroll position
  const handleScroll = useCallback(() => {
    wasAtBottomRef.current = checkIsAtBottom();
  }, [checkIsAtBottom]);

  // Fetch initial data
  useEffect(() => {
    if (podId === null) return;
    fetchMessages(podId);
    if (!pod) fetchPods();
    // Mark pod as seen when opened
    useUnreadStore.getState().markPodSeen(podId.toString());
  }, [podId, fetchMessages, fetchPods, pod]);

  // Poll for new messages
  useEffect(() => {
    if (podId === null) return;
    const interval = setInterval(() => {
      fetchMessages(podId);
      // Mark pod as seen during polling (user is actively viewing)
      useUnreadStore.getState().markPodSeen(podId.toString());
    }, 8000);
    return () => clearInterval(interval);
  }, [podId, fetchMessages]);

  // Auto-scroll only when user was already at bottom
  useEffect(() => {
    if (wasAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [podMessages]);

  const handleSend = async (content: string) => {
    if (podId === null) return;
    // Force scroll to bottom on own send
    wasAtBottomRef.current = true;
    await sendMessage(podId, content);
  };

  // Build sorted messages with collapse logic
  const renderedMessages = useMemo(() => {
    const sorted = [...podMessages].sort((a, b) => a.timestamp - b.timestamp);

    return sorted.map((message, index) => {
      const prev = sorted[index - 1];
      const showSender =
        !prev ||
        prev.sender !== message.sender ||
        message.timestamp - prev.timestamp > 5 * 60 * 1000;

      const isMine = message.sender === evmAddress;
      // Optimistic messages use Date.now() as id which is always > 1_000_000_000_000
      const isOptimistic = message.id > 1_000_000_000_000;

      return (
        <MessageBubble
          key={message.id}
          sender={message.sender}
          content={message.content}
          timestamp={message.timestamp}
          isMine={isMine}
          showSender={showSender}
          isOptimistic={isOptimistic}
        />
      );
    });
  }, [podMessages, evmAddress]);

  if (podId === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid pod ID</p>
        <Link
          to="/explore"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Back to Explore →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border-subtle shrink-0">
        {/* Back arrow — always visible on mobile */}
        <Link to="/explore" className="md:hidden">
          <Button variant="icon" aria-label="Back to explore">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </Link>
        {isLoadingMessages[podId] ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <>
            <h2 className="text-label text-text-primary truncate">{pod?.name}</h2>
            <span className="text-caption text-text-tertiary ml-auto shrink-0">{pod?.memberCount || 0} {pod?.memberCount === 1 ? 'member' : 'members'}</span>
          </>
        )}
      </div>

      {/* Messages area */}
      {messageFetchErrors[podId] && !isLoadingMessages[podId] ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-body-sm text-text-secondary">Could not load messages</p>
          <button
            onClick={() => fetchMessages(podId)}
            className="mt-3 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
          >
            Retry
          </button>
        </div>
      ) : isLoadingMessages[podId] ? (
        <div className="flex-1 px-4 md:px-6 py-4 space-y-4">
          {/* Alternate left/right aligned skeletons to mimic chat */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end">
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-16 w-56 rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end">
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      ) : (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
        >
          {podMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-body-sm text-text-tertiary text-center">
                No messages yet. Start the conversation
              </p>
            </div>
          ) : (
            <>
              {renderedMessages}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Bottom area — connect / join / input */}
      {!isConnected ? (
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border-subtle text-center">
          <Link
            to="/connect"
            className="text-label text-cyan-primary hover:text-cyan-hover"
          >
            Connect wallet to chat →
          </Link>
        </div>
      ) : !isUserMember(podId) ? (
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-surface-2 border-t border-border-subtle text-center">
          <p className="text-body-sm text-text-secondary mb-2">
            Join this pod to send messages
          </p>
          <Link
            to="/explore"
            className="text-label text-cyan-primary hover:text-cyan-hover"
          >
            Back to Explore →
          </Link>
        </div>
      ) : (
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border-subtle bg-base">
          <ChatInput
            placeholder={`Message ${pod?.name || 'pod'}...`}
            onSend={handleSend}
            disabled={!isConnected}
            isSending={isSending}
          />
        </div>
      )}
    </div>
  );
}
