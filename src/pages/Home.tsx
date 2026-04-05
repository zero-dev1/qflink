// src/pages/Home.tsx
import { useEffect, useState } from 'react';
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
import { formatBalance, formatCompactBalance } from '@/lib/utils';
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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Home() {
  const navigate = useNavigate();
  const { isConnected, qnsName, evmAddress, balance } = useWalletStore();
  const { pods, userPodIds, isLoadingPods, fetchPods, fetchUserPods, getPodById } = usePodsStore();
  const { conversations, isLoadingConversations, fetchConversations } = useMessagesStore();
  const isMobile = useIsMobile();

  const [podPreviews, setPodPreviews] = useState<PodPreview[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    fetchPods();
    fetchUserPods();
    fetchConversations();
  }, [isConnected, fetchPods, fetchUserPods, fetchConversations]);

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
        previews.push({ podId, name: pod.name, category: pod.category, memberCount: pod.memberCount, lastMessage, lastMessageTime });
      }
      previews.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) return b.lastMessageTime - a.lastMessageTime;
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return a.name.localeCompare(b.name);
      });
      if (!cancelled) { setPodPreviews(previews); setIsLoadingPreviews(false); }
    }

    buildPreviews();
    return () => { cancelled = true; };
  }, [isConnected, userPodIds, pods, getPodById]);

  const displayName = qnsName ? (
    <>{qnsName.replace('.qf', '')}<span className="text-cyan-primary">.qf</span></>
  ) : evmAddress ? (
    `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
  ) : '';

  const isLoadingUserPods = isLoadingPods || isLoadingPreviews;

  // ── Disconnected ──
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-h1 text-text-primary">Welcome to QFLink</h1>
        <p className="mt-2 text-body text-text-secondary">Connect your wallet to get started</p>
        <Link
          to="/connect"
          className="mt-6 h-10 px-6 rounded-full bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  // ── Loading ──
  if (isLoadingUserPods || isLoadingConversations) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content mx-auto px-6 md:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-1">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="max-w-content mx-auto px-6 md:px-8 py-8"
      >
        {/* ── Greeting row: compact, single line ── */}
        <motion.div variants={fadeUp} className="flex items-baseline justify-between gap-4 mb-6">
          <h1 className="font-display text-h2 text-text-primary truncate">
            {getGreeting()}, {displayName}
          </h1>
          {balance > 0n && (
            <span className="text-label text-text-tertiary shrink-0 tabular-nums">
              {formatCompactBalance(balance)} QF
            </span>
          )}
        </motion.div>

        {/* ── Getting Started + QNS Nudge ── */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              <GettingStartedCard key="getting-started" />
            </AnimatePresence>
            <AnimatePresence>
              {!qnsName && <QnsNudgeCard key="qns-nudge" />}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Your Pods ── */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-label text-text-secondary uppercase tracking-wider">Your Pods</h2>
            {podPreviews.length > 0 && (
              <Link to="/explore" className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors">
                Explore more →
              </Link>
            )}
          </div>

          {podPreviews.length > 0 ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
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
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
              <p className="text-body text-text-secondary">You haven't joined any pods yet</p>
              <Link to="/explore" className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors">
                Explore pods →
              </Link>
            </div>
          )}
        </motion.div>

        {/* ── Recent Messages ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-label text-text-secondary uppercase tracking-wider">Recent Messages</h2>
            {conversations.length > 0 && (
              <Link to="/messages" className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors">
                View all →
              </Link>
            )}
          </div>

          {conversations.length > 0 ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
              {conversations.slice(0, isMobile ? 3 : 5).map((conv) => (
                <ConversationRow
                  key={conv.address}
                  conversation={conv}
                  onClick={() => navigate(`/dm/${conv.address}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
              <p className="text-body text-text-secondary">No messages yet</p>
              <Link to="/messages" className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors">
                Start a conversation →
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
