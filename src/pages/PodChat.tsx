// src/pages/PodChat.tsx
// Design System §17 — Pod chat with tx state bubbles, sender avatars tappable, banned state red footer
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePodsStore } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { useUnreadStore } from '@/stores/unread';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { getBadgesForName, type UserBadge } from '@/lib/badges';
import { ChatInput } from '@/components/chat/ChatInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProfileSheet } from '@/components/ui/ProfileSheet';
import { reverseResolve } from '@/lib/qns';

export default function PodChat() {
  const { id } = useParams<{ id: string }>();
  const { isConnected, evmAddress } = useWalletStore();
  const podId = id ? Number(id) : null;

  const pods = usePodsStore((s) => s.pods);
  const podMessagesRaw = usePodsStore((s) => s.messages);
  const isLoadingMsg = usePodsStore((s) => podId !== null ? !!s.isLoadingMessages[podId] : false);
  const msgFetchError = usePodsStore((s) => podId !== null ? !!s.messageFetchErrors[podId] : false);
  const isSendingMsg = usePodsStore((s) => podId !== null ? !!s.isSending[podId] : false);
  const userPodIds = usePodsStore((s) => s.userPodIds);
  const fetchMessages = usePodsStore((s) => s.fetchMessages);
  const sendMessage = usePodsStore((s) => s.sendMessage);

  const pod = useMemo(
    () => (podId !== null ? pods.find((p) => Number(p.id) === podId) : undefined),
    [pods, podId]
  );
  const podMessages = useMemo(
    () => (podId !== null ? podMessagesRaw[podId] ?? [] : []),
    [podMessagesRaw, podId]
  );
  const isMember = useMemo(
    () => (podId !== null ? userPodIds.includes(podId) : false),
    [userPodIds, podId]
  );

  // Remove messagesEndRef since we're using virtualization
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const pollCountRef = useRef(0);
  const [isBannedFromPod, setIsBannedFromPod] = useState(false);
  const senderNamesRef = useRef<Record<string, string>>({});
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [profileSheetAddress, setProfileSheetAddress] = useState<string | null>(null);
  const [senderBadgeColors, setSenderBadgeColors] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<{ id: number; sender: string; content: string } | null>(null);


  const checkIsAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const handleScroll = useCallback(() => {
    wasAtBottomRef.current = checkIsAtBottom();
  }, [checkIsAtBottom]);

  useEffect(() => {
    if (podId === null) return;
    fetchMessages(podId);
    useUnreadStore.getState().markPodSeen(podId.toString());
  }, [podId, fetchMessages]);

  // Ban check
  const checkBanStatus = useCallback(() => {
    if (podId === null || !isConnected || !evmAddress) return;
    import('@/lib/contractCalls').then(({ isBanned }) => {
      isBanned(podId, evmAddress as `0x${string}`).then(setIsBannedFromPod).catch(() => {});
    });
  }, [podId, isConnected, evmAddress]);

  useEffect(() => { checkBanStatus(); }, [checkBanStatus]);

  // §17 — Resolve sender .qf names for pod messages (stable ref prevents re-run loops)
  useEffect(() => {
    if (podMessages.length === 0) return;
    const uniqueSenders = [...new Set(podMessages.map((m) => m.sender.toLowerCase()))];
    const unresolved = uniqueSenders.filter((s) => !(s in senderNamesRef.current));
    if (unresolved.length === 0) return;

    Promise.allSettled(
      unresolved.map(async (addr) => {
        const name = await reverseResolve(addr);
        let badgeColor: string | undefined;
        if (name) {
          try {
            const badges = await getBadgesForName(name);
            if (badges.length > 0) badgeColor = badges[0].color;
          } catch {}
        }
        return { addr, name, badgeColor };
      })
    ).then((results) => {
      const nameUpdates: Record<string, string> = {};
      const colorUpdates: Record<string, string> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.name) nameUpdates[r.value.addr] = r.value.name;
          if (r.value.badgeColor) colorUpdates[r.value.addr] = r.value.badgeColor;
        }
      }
      if (Object.keys(nameUpdates).length > 0) {
        senderNamesRef.current = { ...senderNamesRef.current, ...nameUpdates };
        setSenderNames({ ...senderNamesRef.current });
      }
      if (Object.keys(colorUpdates).length > 0) {
        setSenderBadgeColors((prev) => ({ ...prev, ...colorUpdates }));
      }
    });
  }, [podMessages]);

  // Poll
  useVisibilityPolling(
    () => {
      if (podId === null) return;
      fetchMessages(podId);
      useUnreadStore.getState().markPodSeen(podId.toString());
      pollCountRef.current += 1;
      if (pollCountRef.current % 3 === 0) checkBanStatus();
    },
    8000,
    [podId, fetchMessages, checkBanStatus],
  );

  const sortedMessages = useMemo(
    () => [...podMessages].sort((a, b) => a.timestamp - b.timestamp),
    [podMessages]
  );

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: sortedMessages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 72, // avg message height — will be measured
    overscan: 10,
  });

  // Auto-scroll: when new messages arrive and user is at bottom
  useEffect(() => {
    if (wasAtBottomRef.current && sortedMessages.length > 0) {
      // Double-rAF ensures virtualizer has measured the new item before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(sortedMessages.length - 1, { align: 'end', behavior: 'smooth' });
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMessages.length]);

  const handleSend = async (content: string) => {
    if (podId === null) return false;
    wasAtBottomRef.current = true;
    const reply = replyTo ? { sender: replyTo.sender, content: replyTo.content } : undefined;
    return await sendMessage(podId, content, reply);
  };


  if (podId === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid pod ID</p>
        <Link to="/explore" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Back to Explore →</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* §17 — Header: pod name + member count */}
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-white/[0.04] shrink-0">
        <Link to="/explore" className="shrink-0">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] active:scale-[0.96]" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Link>
        {isLoadingMsg && !pod ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <>
            <h2 className="text-label text-text-primary truncate">{pod?.name}</h2>
            <span className="text-caption text-text-tertiary ml-auto shrink-0">
              {pod?.memberCount || 0} {pod?.memberCount === 1 ? 'member' : 'members'}
            </span>
          </>
        )}
      </div>

      {/* Messages area */}
      {msgFetchError && !isLoadingMsg ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-body-sm text-text-secondary">Could not load messages</p>
          <button onClick={() => fetchMessages(podId)} className="mt-3 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Retry</button>
        </div>
      ) : isLoadingMsg ? (
        <div className="flex-1 px-4 md:px-6 py-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className={`h-${i % 2 === 0 ? '10' : '14'} w-${i % 2 === 0 ? '40' : '56'} rounded-lg`} />
            </div>
          ))}
        </div>
      ) : (
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 md:px-6">
          {podMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-body-sm text-text-tertiary text-center">No messages yet. Start the conversation</p>
            </div>
          ) : (
            <div
              style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const message = sortedMessages[virtualRow.index];
                const prev = virtualRow.index > 0 ? sortedMessages[virtualRow.index - 1] : undefined;
                const showSender = !prev || prev.sender !== message.sender || message.timestamp - prev.timestamp > 5 * 60 * 1000;
                const isMine = message.sender === evmAddress;

                return (
                  <div
                    key={message.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <MessageBubble
                      sender={message.sender}
                      content={message.content}
                      timestamp={message.timestamp}
                      isMine={isMine}
                      showSender={showSender}
                      senderName={senderNames[message.sender.toLowerCase()] || undefined}
                      senderBadgeColor={senderBadgeColors[message.sender.toLowerCase()] || undefined}
                      isFailed={message.isFailed}
                      onRetry={message.isFailed ? () => usePodsStore.getState().retryMessage(podId!, message.id) : undefined}
                      onDismiss={message.isFailed ? () => usePodsStore.getState().dismissFailedMessage(podId!, message.id) : undefined}
                      onAvatarTap={(addr) => setProfileSheetAddress(addr)}
                      onReply={() => setReplyTo({ id: message.id, sender: message.sender, content: message.content })}
                      replyTo={message.replyToContent ? { sender: message.replyToSender || '', content: message.replyToContent } : null}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* §17 — Bottom states */}
      {!isConnected ? (
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/[0.04] text-center">
          <Link to="/connect" className="text-label text-cyan-primary hover:text-cyan-hover">Connect wallet to chat →</Link>
        </div>
      ) : isBannedFromPod ? (
        /* §17 — Banned state: red footer */
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-error/5 border-t border-error/20 text-center">
          <p className="text-body-sm text-error">You are banned from this pod</p>
        </div>
      ) : !isMember ? (
        <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/[0.02] border-t border-white/[0.04] text-center">
          <p className="text-body-sm text-text-secondary mb-2">Join this pod to send messages</p>
          <Link to="/explore" className="text-label text-cyan-primary hover:text-cyan-hover">Back to Explore →</Link>
        </div>
      ) : (
        <div className="shrink-0 px-4 md:px-6 pt-4 pb-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/[0.06] bg-base">
          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center justify-between mb-2 pl-3 pr-1 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-0.5 h-4 bg-cyan-primary rounded-full shrink-0" />
                <p className="text-caption text-text-tertiary truncate">
                  {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '…' : ''}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} className="shrink-0 w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-secondary" aria-label="Cancel reply">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
          )}
          <ChatInput
            placeholder={replyTo ? 'Reply...' : `Message ${pod?.name || 'pod'}...`}
            onSend={async (content) => {
              const result = await handleSend(content);
              if (result) setReplyTo(null);
              return result;
            }}
            disabled={!isConnected}
            isSending={isSendingMsg}
          />
        </div>
      )}

      {/* §11 — Avatar-as-portal: profile sheet for any sender */}
      {profileSheetAddress && (
        <ProfileSheet
          address={profileSheetAddress}
          isOpen={!!profileSheetAddress}
          onClose={() => setProfileSheetAddress(null)}
          podContext={pod && evmAddress ? {
            podId: Number(pod.id),
            isCreatorOrMod: pod.creator.toLowerCase() === evmAddress.toLowerCase(),
          } : undefined}
        />
      )}
    </div>
  );
}
