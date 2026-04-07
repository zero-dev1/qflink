// src/pages/DMChat.tsx
// Design System §16.2 — Header with tappable avatar, encryption indicator, tx state bubbles
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, LockOpen } from 'lucide-react';
import { useMessagesStore } from '@/stores/messages';
import { useWalletStore } from '@/stores/wallet';
import { useUnreadStore } from '@/stores/unread';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProfileSheet } from '@/components/ui/ProfileSheet';
import { reverseResolve } from '@/lib/qns';

export default function DMChat() {
  const { address } = useParams<{ address: string }>();
  const { isConnected, evmAddress, encryptionKeyPair } = useWalletStore((state) => ({
    isConnected: state.isConnected,
    evmAddress: state.evmAddress,
    encryptionKeyPair: state.encryptionKeyPair,
  }));
  const otherAddress = address?.toLowerCase() || '';

  const dmMessages = useMessagesStore((state) => state.messages[otherAddress] || []);
  const isLoadingMsg = useMessagesStore((state) => state.isLoadingMessages[otherAddress] || false);
  const isSendingMsg = useMessagesStore((state) => state.isSending[otherAddress] || false);
  const fetchMessages = useMessagesStore((state) => state.fetchMessages);
  const sendMessage = useMessagesStore((state) => state.sendMessage);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recipientEncryptionReady, setRecipientEncryptionReady] = useState<boolean>(true);
  const [showProfileSheet, setShowProfileSheet] = useState(false);


  // Resolve recipient QNS name
  useEffect(() => {
    if (!otherAddress) return;
    reverseResolve(otherAddress).then((name) => setRecipientName(name)).catch(() => {});
  }, [otherAddress]);

  // Check recipient encryption readiness
  useEffect(() => {
    if (!otherAddress) return;
    import('@/lib/contractCalls').then(({ getProfile }) => {
      getProfile(otherAddress as `0x${string}`).then((profile) => {
        const hasPubkey = profile?.encryptionPubkey && profile.encryptionPubkey !== '0x' && !/^0x0+$/.test(profile.encryptionPubkey);
        setRecipientEncryptionReady(!!hasPubkey);
      }).catch(() => {});
    });
  }, [otherAddress]);

  const isEncrypted = !!encryptionKeyPair && recipientEncryptionReady;

  // Scroll tracking
  const checkIsAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const handleScroll = useCallback(() => {
    wasAtBottomRef.current = checkIsAtBottom();
  }, [checkIsAtBottom]);

  // Fetch messages
  useEffect(() => {
    if (!otherAddress || !isConnected) return;
    fetchMessages(otherAddress);
    useUnreadStore.getState().markDMSeen(otherAddress);
  }, [otherAddress, isConnected, fetchMessages]);

  // Poll
  useVisibilityPolling(
    () => {
      if (!otherAddress || !isConnected) return;
      fetchMessages(otherAddress);
      useUnreadStore.getState().markDMSeen(otherAddress);
    },
    8000,
    [otherAddress, isConnected, fetchMessages],
  );

  // Auto-scroll
  useEffect(() => {
    if (wasAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dmMessages]);

  const handleSend = async (content: string) => {
    if (!otherAddress) return false;
    wasAtBottomRef.current = true;
    return await sendMessage(otherAddress, content);
  };

  // Build rendered messages
  const renderedMessages = useMemo(() => {
    const sorted = [...dmMessages].sort((a, b) => a.timestamp - b.timestamp);

    return sorted.map((msg, index) => {
      const prev = sorted[index - 1];
      const showSender = !prev || prev.sender !== msg.sender || msg.timestamp - prev.timestamp > 5 * 60 * 1000;
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
          isFailed={msg.isFailed}
          onRetry={msg.isFailed ? () => useMessagesStore.getState().retryMessage(otherAddress, msg.id) : undefined}
          onDismiss={msg.isFailed ? () => useMessagesStore.getState().dismissFailedMessage(otherAddress, msg.id) : undefined}
        />
      );
    });
  }, [dmMessages, evmAddress, recipientName, otherAddress]);

  // Display name
  const headerName = recipientName || (otherAddress ? `${otherAddress.slice(0, 6)}...${otherAddress.slice(-4)}` : 'Unknown');

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view this conversation</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Connect →</Link>
      </div>
    );
  }

  if (!otherAddress) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid address</p>
        <Link to="/messages" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Back to Messages →</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* §16.2 — Header with tappable avatar + encryption indicator */}
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-white/[0.04] shrink-0">
        <Link to="/messages" className="shrink-0">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] active:scale-[0.96]" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Link>

        {/* Tappable avatar → profile sheet */}
        <button onClick={() => setShowProfileSheet(true)} className="shrink-0 active:scale-[0.96]" aria-label="View profile">
          <Avatar address={otherAddress} size={32} />
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-label text-text-primary truncate block">
            {recipientName ? (
              <>{recipientName.replace('.qf', '')}<span className="text-cyan-primary">.qf</span></>
            ) : headerName}
          </span>
        </div>

        {/* Encryption indicator */}
        {isEncrypted && (
          <span className="shrink-0" title="End-to-end encrypted" aria-label="End-to-end encrypted"><Lock size={14} className="text-cyan-primary" strokeWidth={1.5} /></span>
        )}
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {isLoadingMsg ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className="h-10 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : dmMessages.length === 0 ? (
          /* §16.2 — Empty state: large avatar + "Everything here lives on-chain." */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Avatar address={otherAddress} size={80} className="mx-auto mb-4" />
              <p className="text-label text-text-primary">
                {recipientName ? (
                  <>{recipientName.replace('.qf', '')}<span className="text-cyan-primary">.qf</span></>
                ) : headerName}
              </p>
              <p className="mt-2 text-body-sm text-text-tertiary">
                Everything here lives on-chain.
              </p>
              {isEncrypted && (
                <p className="mt-1 text-caption text-cyan-primary inline-flex items-center gap-1"><Lock size={12} strokeWidth={1.5} /> End-to-end encrypted</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {renderedMessages}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Encryption warning */}
      {!recipientEncryptionReady && isConnected && (
        <div className="px-4 md:px-6 py-2 bg-warning/5 border-t border-warning/20">
          <p className="text-caption text-warning/80 text-center">
            Messages to this user are not encrypted — they haven't set up encryption yet
          </p>
        </div>
      )}

      {/* §16.2 — Chat input with encryption indicator */}
      <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/[0.04] bg-base">
        <div className="flex items-center gap-2">
          {/* Encryption indicator left of input */}
          <span className="text-sm shrink-0" title={isEncrypted ? 'Encrypted' : 'Not encrypted'} role="img" aria-label={isEncrypted ? 'Messages are encrypted' : 'Messages are not encrypted'}>
            {isEncrypted ? <Lock size={14} className="text-cyan-primary" strokeWidth={1.5} /> : <LockOpen size={14} className="text-text-tertiary" strokeWidth={1.5} />}
          </span>
          <div className="flex-1">
            <ChatInput
              placeholder={`Message ${recipientName || headerName}...`}
              onSend={handleSend}
              disabled={!isConnected}
              isSending={isSendingMsg}
            />
          </div>
        </div>
      </div>

      {/* §11 — Avatar-as-portal: profile sheet for recipient */}
      <ProfileSheet
        address={otherAddress}
        isOpen={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
      />
    </div>
  );
}
