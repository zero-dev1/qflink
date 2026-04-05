// src/pages/Home.tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useMessagesStore } from '@/stores/messages';
import { GettingStartedCard } from '@/components/home/GettingStartedCard';
import { QnsNudgeCard } from '@/components/home/QnsNudgeCard';
import { PodListItem } from '@/components/home/PodListItem';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBalance } from '@/lib/utils';
import { getPodMessages } from '@/lib/contractCalls';
import { useIsMobile } from '@/hooks/useIsMobile';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface PodPreview {
  podId: number;
  name: string;
  category: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export default function Home() {
  const navigate = useNavigate();
  const { isConnected, qnsName, evmAddress, balance } = useWalletStore();
  const { pods, userPodIds, isLoadingPods, fetchPods, fetchUserPods, getPodById } = usePodsStore();
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
  } = useMessagesStore();
  const isMobile = useIsMobile();

  const [podPreviews, setPodPreviews] = useState<PodPreview[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  // Fetch pods + user pods on mount
  useEffect(() => {
    if (!isConnected) return;
    fetchPods();
    fetchUserPods();
    fetchConversations();
  }, [isConnected, fetchPods, fetchUserPods, fetchConversations]);

  // Build pod previews with last message once userPodIds and pods are loaded
  useEffect(() => {
    if (!isConnected || userPodIds.length === 0) {
      setPodPreviews([]);
      return;
    }

    let cancelled = false;
    setIsLoadingPreviews(true);

    async function buildPreviews() {
      const previews: PodPreview[] = [];

      for (const podId of userPodIds) {
        const pod = getPodById(podId);
        if (!pod) continue;

        let lastMessage: string | undefined;
        let lastMessageTime: number | undefined;

        try {
          const msgs = await getPodMessages(podId, 0, 1);
          if (msgs.length > 0) {
            lastMessage = msgs[msgs.length - 1].content;
            lastMessageTime = msgs[msgs.length - 1].timestamp;
          }
        } catch {}

        if (cancelled) return;

        previews.push({
          podId,
          name: pod.name,
          category: pod.category,
          memberCount: pod.memberCount,
          lastMessage,
          lastMessageTime,
        });
      }

      // Sort: pods with recent messages first, then alphabetical
      previews.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) return b.lastMessageTime - a.lastMessageTime;
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return a.name.localeCompare(b.name);
      });

      if (!cancelled) {
        setPodPreviews(previews);
        setIsLoadingPreviews(false);
      }
    }

    buildPreviews();
    return () => { cancelled = true; };
  }, [isConnected, userPodIds, pods, getPodById]);

  // Display name for greeting
  const displayName = qnsName ? (
    <>
      {qnsName.replace('.qf', '')}
      <span className="text-cyan-primary">.qf</span>
    </>
  ) : evmAddress ? (
    `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
  ) : (
    ''
  );

  const isLoadingUserPods = isLoadingPods || isLoadingPreviews;

  // ── Loading State ──
  if (isLoadingUserPods || isLoadingConversations) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* Greeting skeleton */}
        <Skeleton className="h-8 w-48" />
        
        {/* Getting started card skeleton */}
        <Skeleton className="h-32 w-full rounded-lg" />
        
        {/* Pod list skeleton */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        
        {/* Conversations skeleton */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
    );
  }

  // ── Disconnected State ──
  if (!isConnected) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-h1 text-text-primary">Welcome to QFLink</h1>
        <p className="mt-2 text-body text-text-secondary">
          Connect your wallet to get started
        </p>
        <Link
          to="/connect"
          className="mt-6 h-10 px-6 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          Connect Wallet
        </Link>
        </div>
      </div>
    );
  }

  // ── Connected State ──
  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="max-w-content mx-auto px-6 md:px-8 py-8 space-y-8"
      >
      {/* Greeting */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-display text-h1 md:text-display text-text-primary"
        >
          {getGreeting()}, {displayName}
        </motion.h1>

        {/* Balance subtext */}
        {balance > 0n && (
          <p className="mt-1 text-body-sm text-text-secondary">
            {formatBalance(balance)} QF
          </p>
        )}
      </motion.div>

      {/* Getting Started + QNS Nudge cards */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            <GettingStartedCard key="getting-started" />
          </AnimatePresence>
          <AnimatePresence>
            {!qnsName && <QnsNudgeCard key="qns-nudge" />}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Your Pods */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h2 text-text-primary">Your Pods</h2>
          {podPreviews.length > 0 && (
            <Link
              to="/explore"
              className="text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              Explore more →
            </Link>
          )}
        </div>

        {isLoadingUserPods ? (
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : podPreviews.length > 0 ? (
          <div className="flex flex-col gap-1">
            {podPreviews.map((pod) => (
              <PodListItem
                key={pod.podId}
                podId={pod.podId}
                name={pod.name}
                category={pod.category}
                memberCount={pod.memberCount}
                lastMessage={pod.lastMessage}
                lastMessageTime={pod.lastMessageTime}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-surface-2 border border-border-subtle p-6 text-center">
            <p className="text-body text-text-secondary">
              You haven't joined any pods yet
            </p>
            <Link
              to="/explore"
              className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              Explore pods →
            </Link>
          </div>
        )}
      </motion.div>

      {/* Recent Messages */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h2 text-text-primary">Recent Messages</h2>
          {conversations.length > 0 && (
            <Link
              to="/messages"
              className="text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              View all →
            </Link>
          )}
        </div>

        {isLoadingConversations ? (
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length > 0 ? (
          <div className="flex flex-col gap-1">
            {conversations.slice(0, isMobile ? 3 : 5).map((conv) => (
              <ConversationRow
                key={conv.address}
                conversation={conv}
                onClick={() => navigate(`/dm/${conv.address}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-surface-2 border border-border-subtle p-6 text-center">
            <p className="text-body text-text-secondary">No messages yet</p>
            <Link
              to="/messages"
              className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              Start a conversation →
            </Link>
          </div>
        )}
      </motion.div>
      </motion.div>
    </div>
  );
}
