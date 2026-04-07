// src/pages/Home.tsx
// Design System §13 — No "Home" title. Greeting IS the header.
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useMessagesStore } from '@/stores/messages';
import { useModeStore } from '@/stores/mode';
import { useGettingStartedStore } from '@/stores/gettingStarted';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBalance, formatCompactBalance } from '@/lib/utils';
import { getCategoryColor } from '@/lib/categories';
import { getPodMessages } from '@/lib/contractCalls';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useUnreadStore } from '@/stores/unread';
import { ProfileSheet } from '@/components/ui/ProfileSheet';

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
  hasUnread: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Home() {
  const navigate = useNavigate();
  const { isConnected, qnsName, evmAddress, balance } = useWalletStore();
  const pods = usePodsStore((s) => s.pods);
  const userPodIds = usePodsStore((s) => s.userPodIds);
  const isLoadingPods = usePodsStore((s) => s.isLoadingPods);

  const conversations = useMessagesStore((s) => s.conversations);
  const isLoadingConversations = useMessagesStore((s) => s.isLoadingConversations);
  const isMobile = useIsMobile();

  const podPreviews = useMemo(() => {
    if (!isConnected || userPodIds.length === 0) return [];
    return userPodIds
      .map((podId) => {
        const pod = pods.find((p) => Number(p.id) === podId);
        if (!pod) return null;
        const hasUnread = useUnreadStore.getState().hasPodUnread(podId.toString());
        return { podId, name: pod.name, category: pod.category, memberCount: pod.memberCount, hasUnread };
      })
      .filter(Boolean) as PodPreview[];
  }, [isConnected, userPodIds, pods]);
  const [profileSheetAddress, setProfileSheetAddress] = useState<string | null>(null);



  // Display name with split render
  const firstName = qnsName ? qnsName.replace('.qf', '') : null;

  const isLoading = isLoadingPods || isLoadingConversations;

  // ── Disconnected ──
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-h1 text-text-primary">Welcome to QFLink</h1>
        <p className="mt-2 text-body text-text-secondary">Connect your wallet to get started</p>
        <Link
          to="/connect"
          className="mt-6 h-10 px-6 rounded-pill bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors active:scale-[0.98]"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content px-6 md:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-8 w-20 rounded-pill" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="space-y-1">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Momentum tracker — one next action card ──
  const { hasConnected, hasJoinedPod, hasSentMessage, dismissed: gsDismissed, isComplete: gsComplete } = useGettingStartedStore.getState();
  const showMomentum = !gsDismissed && !gsComplete();
  const momentumStep = !hasJoinedPod
    ? { label: 'Join your first pod', link: '/explore', cta: 'Explore pods →' }
    : !hasSentMessage
      ? { label: 'Send your first message', link: '/messages', cta: 'Start a conversation →' }
      : null;

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="max-w-content px-6 md:px-8 py-8"
      >
        {/* §13.1 — Greeting + Balance */}
        <motion.div variants={fadeUp} className="flex items-baseline justify-between gap-4 mb-6">
          <h1 className="font-display text-h1 text-text-primary truncate">
            {getGreeting()},{' '}
            {firstName ? (
              <>
                {firstName}<span className="text-cyan-primary">.qf</span>
              </>
            ) : evmAddress ? (
              `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
            ) : ''}
          </h1>
          {balance > 0n && (
            <button
              onClick={() => navigate('/profile')}
              className="shrink-0 h-8 px-3 rounded-pill bg-white/[0.03] border border-white/[0.06] text-label text-text-secondary tabular-nums hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
            >
              {formatCompactBalance(balance)} QF
            </button>
          )}
        </motion.div>

        {/* §13.2 — QNS Nudge (no .qf name only) */}
        <AnimatePresence>
          {!qnsName && evmAddress && (
            <motion.div
              key="qns-nudge"
              variants={fadeUp}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 rounded-xl bg-white/[0.03] border border-cyan-border backdrop-blur-md p-5"
            >
              <p className="text-body text-text-primary">
                You're <span className="font-mono text-body-sm text-text-secondary">{evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}</span>
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Claim your <span className="text-cyan-primary animate-shimmer bg-gradient-to-r from-cyan-primary via-white to-cyan-primary bg-[length:200%_100%] bg-clip-text">.qf</span> name and become someone.
              </p>
              <a
                href="https://dotqf.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors active:scale-[0.98]"
              >
                Claim your name →
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* §13.3 — Your Pods (horizontal card row) */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-label text-text-secondary">Your Pods</h2>
            {podPreviews.length > 0 && (
              <Link to="/explore" className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors">
                Explore →
              </Link>
            )}
          </div>

          {podPreviews.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 snap-x snap-mandatory">
              {podPreviews.map((pod) => (
                <button
                  key={pod.podId}
                  onClick={() => navigate(`/pod/${pod.podId}`)}
                  aria-label={`Open ${pod.name} pod${pod.hasUnread ? ', has unread messages' : ''}`}
                  className="snap-start shrink-0 w-[200px] h-[120px] rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-between text-left hover:border-white/[0.10] transition-colors active:scale-[0.98] relative overflow-hidden"
                >
                  {/* Color strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: getCategoryColor(pod.category) }}
                  />
                  {/* Unread glow */}
                  {pod.hasUnread && (
                    <div className="absolute top-0 left-0 right-0 h-1 animate-unread-pulse" style={{ backgroundColor: getCategoryColor(pod.category), filter: 'blur(4px)' }} />
                  )}
                  <div>
                    <p className="text-caption text-text-tertiary">{pod.category}</p>
                    <p className="text-label text-text-primary mt-0.5 truncate">{pod.name}</p>
                  </div>
                  <p className="text-caption text-text-tertiary">{pod.memberCount} members</p>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate('/explore')}
              className="w-full rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-8 text-center hover:border-white/[0.15] transition-colors active:scale-[0.98]"
            >
              <p className="text-body text-text-secondary">Join your first pod</p>
              <p className="mt-1 text-label text-cyan-primary">Explore pods →</p>
            </button>
          )}
        </motion.div>

        {/* §13.4 — Recent Messages */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-label text-text-secondary">Messages</h2>
            {conversations.length > 0 && (
              <Link to="/messages" className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors">
                View all →
              </Link>
            )}
          </div>

          {conversations.length > 0 ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
              {conversations.slice(0, isMobile ? 2 : 3).map((conv) => (
                <ConversationRow
                  key={conv.address}
                  conversation={conv}
                  onClick={() => navigate(`/dm/${conv.address}`)}
                  onAvatarTap={(addr) => setProfileSheetAddress(addr)}
                />
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate('/messages')}
              className="w-full rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-8 text-center hover:border-white/[0.15] transition-colors active:scale-[0.98]"
            >
              <p className="text-body text-text-secondary">Start a conversation</p>
              <p className="mt-1 text-label text-cyan-primary">Message someone →</p>
            </button>
          )}
        </motion.div>

        {/* §13.5 — Momentum Tracker (one next action card) */}
        <AnimatePresence>
          {showMomentum && momentumStep && (
            <motion.div
              key="momentum"
              variants={fadeUp}
              exit={{ opacity: 0, y: -8 }}
              className="mb-8"
            >
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* Dot progress */}
                  <div className="flex gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${hasConnected ? 'bg-cyan-primary' : 'bg-white/[0.10]'}`} />
                    <div className={`w-2 h-2 rounded-full ${hasJoinedPod ? 'bg-cyan-primary' : 'bg-white/[0.10]'}`} />
                    <div className={`w-2 h-2 rounded-full ${hasSentMessage ? 'bg-cyan-primary' : 'bg-white/[0.10]'}`} />
                  </div>
                  <span className="text-caption text-text-tertiary">Next step</span>
                </div>
                <p className="text-body text-text-primary">{momentumStep.label}</p>
                <Link
                  to={momentumStep.link}
                  className="mt-2 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors active:scale-[0.98]"
                >
                  {momentumStep.cta}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* §13.6 — Network Pulse (future placeholder) */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-caption text-text-tertiary">
            {pods.length} pods · {pods.reduce((s, p) => s + p.memberCount, 0)} members
          </p>
        </motion.div>
      </motion.div>

      {/* §11 — Avatar-as-portal */}
      {profileSheetAddress && (
        <ProfileSheet
          address={profileSheetAddress}
          isOpen={!!profileSheetAddress}
          onClose={() => setProfileSheetAddress(null)}
        />
      )}
    </div>
  );
}
