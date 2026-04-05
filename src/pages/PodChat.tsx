import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePodsStore } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
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
  }, [podId, fetchMessages, fetchPods, pod]);

  // Poll for new messages
  useEffect(() => {
    if (podId === null) return;
    const interval = setInterval(() => fetchMessages(podId), 8000);
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
      <div className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-border-subtle shrink-0">
        <Button
          variant="icon"
          onClick={() => navigate('/explore')}
          className="md:hidden"
        >
          ←
        </Button>
        <h2 className="text-h3 font-sans font-semibold text-text-primary">
          {pod?.name || `Pod ${podId}`}
        </h2>
        <div className="ml-auto text-caption text-text-tertiary">
          {pod?.memberCount || 0} members
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
      >
        {isLoadingMessages[podId] ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} mt-4`}
              >
                <div className="max-w-[85%] md:max-w-[75%]">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-8 w-48" />
                </div>
              </div>
            ))}
          </>
        ) : podMessages.length === 0 ? (
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

      {/* Bottom area — connect / join / input */}
      {!isConnected ? (
        <div className="px-6 py-4 border-t border-border-subtle text-center">
          <Link
            to="/connect"
            className="text-label text-cyan-primary hover:text-cyan-hover"
          >
            Connect wallet to chat →
          </Link>
        </div>
      ) : !isUserMember(podId) ? (
        <div className="px-6 py-3 bg-surface-2 border-t border-border-subtle text-center">
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
        <ChatInput
          placeholder={`Message ${pod?.name || 'pod'}...`}
          onSend={handleSend}
          disabled={!isConnected}
          isSending={isSending}
        />
      )}
    </div>
  );
}
