// src/pages/DMChat.tsx
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMessagesStore } from '@/stores/messages';
import { useWalletStore } from '@/stores/wallet';
import { useUnreadStore } from '@/stores/unread';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { reverseResolve } from '@/lib/qns';

export default function DMChat() {
  const { address } = useParams<{ address: string }>();
  const { isConnected, evmAddress } = useWalletStore();
  const {
    messages,
    isLoadingMessages,
    isSending,
    fetchMessages,
    sendMessage,
  } = useMessagesStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recipientEncryptionReady, setRecipientEncryptionReady] = useState<boolean>(true);

  const otherAddress = address?.toLowerCase() || '';
  const dmMessages = messages[otherAddress] || [];

  // Resolve recipient QNS name
  useEffect(() => {
    if (!otherAddress) return;
    reverseResolve(otherAddress)
      .then((name) => setRecipientName(name))
      .catch(() => {});
  }, [otherAddress]);

  // Check recipient encryption readiness
  useEffect(() => {
    if (!otherAddress) return;
    import('@/lib/contractCalls').then(({ getProfile }) => {
      getProfile(otherAddress as `0x${string}`).then((profile) => {
        const hasPubkey = profile?.encryptionPubkey &&
          profile.encryptionPubkey !== '0x' &&
          !/^0x0+$/.test(profile.encryptionPubkey);
        setRecipientEncryptionReady(!!hasPubkey);
      }).catch(() => {});
    });
  }, [otherAddress]);

  // Scroll tracking
  const checkIsAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const handleScroll = useCallback(() => {
    wasAtBottomRef.current = checkIsAtBottom();
  }, [checkIsAtBottom]);

  // Fetch messages on mount
  useEffect(() => {
    if (!otherAddress || !isConnected) return;
    fetchMessages(otherAddress);
    useUnreadStore.getState().markDMSeen(otherAddress);
  }, [otherAddress, isConnected, fetchMessages]);

  // Poll every 8s
  useEffect(() => {
    if (!otherAddress || !isConnected) return;
    const interval = setInterval(() => {
      fetchMessages(otherAddress);
      useUnreadStore.getState().markDMSeen(otherAddress);
    }, 8000);
    return () => clearInterval(interval);
  }, [otherAddress, isConnected, fetchMessages]);

  // Auto-scroll when at bottom
  useEffect(() => {
    if (wasAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dmMessages]);

  const handleSend = async (content: string) => {
    if (!otherAddress) return;
    wasAtBottomRef.current = true;
    await sendMessage(otherAddress, content);
  };

  // Build rendered messages
  const renderedMessages = useMemo(() => {
    const sorted = [...dmMessages].sort((a, b) => a.timestamp - b.timestamp);

    return sorted.map((msg, index) => {
      const prev = sorted[index - 1];
      const showSender =
        !prev ||
        prev.sender !== msg.sender ||
        msg.timestamp - prev.timestamp > 5 * 60 * 1000;

      const isMine = msg.sender.toLowerCase() === evmAddress?.toLowerCase();

      return (
        <MessageBubble
          key={msg.id}
          sender={msg.sender}
          content={msg.content}
          timestamp={msg.timestamp}
          isMine={isMine}
          showSender={showSender}
          senderName={!isMine ? recipientName || undefined : undefined}
          isOptimistic={msg.isOptimistic}
        />
      );
    });
  }, [dmMessages, evmAddress, recipientName]);

  // Display name for header — FIX: always show something
  const headerDisplayName = recipientName
    ? recipientName
    : otherAddress
      ? `${otherAddress.slice(0, 6)}...${otherAddress.slice(-4)}` 
      : 'Unknown';

  // Disconnected state
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">
          Connect your wallet to view this conversation
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

  if (!otherAddress) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid address</p>
        <Link
          to="/messages"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Back to Messages →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-white/[0.04] shrink-0">
        <Link to="/messages">
          <Button variant="icon" aria-label="Back to messages">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </Link>
        <Avatar address={otherAddress} size={32} />
        <span className="text-label text-text-primary truncate">
          {recipientName ? (
            <>
              {recipientName.replace('.qf', '')}
              <span className="text-cyan-primary">.qf</span>
            </>
          ) : (
            headerDisplayName
          )}
        </span>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
      >
        {isLoadingMessages[otherAddress] ? (
          <>
            {[1, 2, 3].map((i) => (
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
        ) : dmMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Avatar address={otherAddress} size={48} className="mx-auto mb-3" />
              <p className="text-body text-text-secondary">
                This is the beginning of your conversation with{' '}
                {recipientName && recipientName.endsWith('.qf') ? (
                  <>
                    {recipientName.slice(0, -3)}
                    <span className="text-cyan-primary">.qf</span>
                  </>
                ) : (
                  headerDisplayName
                )}
              </p>
              <p className="mt-1 text-body-sm text-text-tertiary">
                Messages are stored on-chain forever
              </p>
            </div>
          </div>
        ) : (
          <>
            {renderedMessages}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {!recipientEncryptionReady && isConnected && (
        <div className="px-4 md:px-6 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <p className="text-caption text-yellow-400/80 text-center">
            Messages to this user are not encrypted — they haven't set up encryption yet
          </p>
        </div>
      )}

      {/* Chat input */}
      <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/[0.04] bg-base">
        <ChatInput
          placeholder={`Message ${recipientName || headerDisplayName}...`}
          onSend={handleSend}
          disabled={!isConnected}
          isSending={isSending}
        />
      </div>
    </div>
  );
}
