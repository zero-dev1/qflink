// src/pages/Explore.tsx
// Design System §14 — Unified stream, category pills, sort tabs, inline expansion
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePodsStore, PodData } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { PodCard } from '@/components/pods/PodCard';
import { PodComposer } from '@/components/pods/PodComposer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileSheet } from '@/components/ui/ProfileSheet';
import { useActionBarStore } from '@/components/ui/ActionBar';
import { CATEGORIES, getCategoryColor } from '@/lib/categories';
import { formatExactAmount, formatBalance, cn } from '@/lib/utils';

type SortMode = 'active' | 'new' | 'popular';

export default function Explore() {
  const navigate = useNavigate();
  const { isConnected, balance } = useWalletStore();
  const {
    pods,
    userPodIds,
    isLoadingPods,
    podFetchError,
    isJoining,
    fetchPods,
    fetchUserPods,
    joinPod,
    isUserMember,
  } = usePodsStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('active');
  const [expandedPodId, setExpandedPodId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [profileSheetAddress, setProfileSheetAddress] = useState<string | null>(null);

  // Badge cache for official detection
  const [creatorBadges, setCreatorBadges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPods();
    if (isConnected) fetchUserPods();
  }, [fetchPods, fetchUserPods, isConnected]);

  // Fetch creator badges
  useEffect(() => {
    if (pods.length === 0) return;
    const creators = [...new Set(pods.map((p) => p.creator.toLowerCase()))];
    const unchecked = creators.filter((c) => !(c in creatorBadges));
    if (unchecked.length === 0) return;

    Promise.allSettled(
      unchecked.map(async (creator) => {
        try {
          const { reverseResolve } = await import('@/lib/qns');
          const name = await reverseResolve(creator);
          if (!name) return { creator, isOfficial: false };
          const { getBadgesForName } = await import('@/lib/badges');
          const badges = await getBadgesForName(name);
          return { creator, isOfficial: badges.some((b) => b.type === 'team' || b.type === 'dapplab') };
        } catch {
          return { creator, isOfficial: false };
        }
      })
    ).then((results) => {
      const updates: Record<string, boolean> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') updates[r.value.creator] = r.value.isOfficial;
      }
      if (Object.keys(updates).length > 0) setCreatorBadges((prev) => ({ ...prev, ...updates }));
    });
  }, [pods]);

  const isOfficialPod = (pod: PodData) => creatorBadges[pod.creator.toLowerCase()] === true;

  // Filter + sort
  const filteredSortedPods = useMemo(() => {
    let filtered = pods;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Sort
    const sorted = [...filtered];
    switch (sortMode) {
      case 'active':
        sorted.sort((a, b) => b.memberCount - a.memberCount);
        break;
      case 'new':
        sorted.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        break;
      case 'popular':
        sorted.sort((a, b) => b.memberCount - a.memberCount);
        break;
    }

    return sorted;
  }, [pods, selectedCategory, sortMode]);

  // Featured = official + top community
  const featuredPods = useMemo(() => {
    return pods
      .filter((p) => isOfficialPod(p) || p.memberCount > 3)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 6);
  }, [pods, creatorBadges]);

  const expandedPod = expandedPodId !== null ? pods.find((p) => Number(p.id) === expandedPodId) : null;

  const handleJoin = async (podId: number) => {
    const success = await joinPod(podId);
    if (success) navigate(`/pod/${podId}`);
  };

  // Error state
  if (podFetchError && !isLoadingPods) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Failed to load pods</p>
        <button onClick={() => fetchPods()} className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Try again →
        </button>
      </div>
    );
  }

  if (isLoadingPods) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content-wide px-6 md:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-9 w-full rounded-pill mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-content-wide px-6 md:px-8 py-8">
        {/* §14.1 — Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-h1 text-text-primary">Explore</h1>
          <button
            onClick={() => useActionBarStore.getState().open()}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] transition-colors active:scale-[0.96]"
            aria-label="Search pods"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* §14.1 — Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 mb-4">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              aria-label={`Filter by ${cat}${selectedCategory === cat ? ', selected' : ''}`}
              aria-pressed={selectedCategory === cat}
              className={cn(
                'shrink-0 h-8 px-4 rounded-pill text-caption font-medium transition-all active:scale-[0.96]',
                selectedCategory === cat
                  ? 'bg-cyan-primary text-text-on-cyan'
                  : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* §14.1 — Sort tabs */}
        <div className="flex gap-4 mb-6" role="tablist" aria-label="Sort pods">
          {(['active', 'new', 'popular'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={sortMode === mode}
              onClick={() => setSortMode(mode)}
              className={cn(
                'text-label capitalize pb-1 transition-colors',
                sortMode === mode
                  ? 'text-text-primary border-b border-cyan-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {mode === 'active' ? 'Active' : mode === 'new' ? 'New' : 'Popular'}
            </button>
          ))}
        </div>

        {/* §14.1 — Featured row (horizontal scroll) */}
        {selectedCategory === 'All' && featuredPods.length > 0 && (
          <div className="mb-8">
            <h2 className="text-label text-text-secondary mb-3">Featured</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 snap-x snap-mandatory">
              {featuredPods.map((pod) => (
                <div key={String(pod.id)} className="snap-start shrink-0 w-[280px]">
                  <PodCard
                    pod={pod}
                    isOfficial={isOfficialPod(pod)}
                    onClick={() => setExpandedPodId(Number(pod.id))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* §14.1 — All Pods grid (unified stream) */}
        {filteredSortedPods.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredSortedPods.map((pod) => (
              <motion.div
                key={String(pod.id)}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              >
                <PodCard
                  pod={pod}
                  isOfficial={isOfficialPod(pod)}
                  onClick={() => setExpandedPodId(Number(pod.id))}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-12 text-center">
            <p className="text-body text-text-secondary">
              No {selectedCategory !== 'All' ? selectedCategory : ''} pods yet — be the first.
            </p>
            <button
              onClick={() => setShowComposer(true)}
              className="mt-3 text-label text-cyan-primary hover:text-cyan-hover transition-colors active:scale-[0.98]"
            >
              Launch your pod →
            </button>
          </div>
        )}

        {/* §14.6 — Creation CTA */}
        {filteredSortedPods.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowComposer(true)}
              className="h-10 px-6 rounded-pill bg-white/[0.03] border border-white/[0.06] text-label text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
            >
              + Launch your pod
            </button>
          </div>
        )}

        {/* §14.4 — Inline pod detail expansion */}
        <AnimatePresence>
          {expandedPod && (
            <PodDetailInline
              pod={expandedPod}
              isOfficial={isOfficialPod(expandedPod)}
              isConnected={isConnected}
              isMember={isUserMember(Number(expandedPod.id))}
              isJoining={isJoining === Number(expandedPod.id)}
              userBalance={balance}
              onJoin={() => handleJoin(Number(expandedPod.id))}
              onEnter={() => navigate(`/pod/${expandedPod.id}`)}
              onClose={() => setExpandedPodId(null)}
              onCreatorTap={(addr) => setProfileSheetAddress(addr)}
            />
          )}
        </AnimatePresence>

        {/* §15 — Pod Composer (6-beat progressive reveal, real contract calls) */}
        <AnimatePresence>
          {showComposer && (
            <PodComposer
              onClose={() => setShowComposer(false)}
              onSuccess={() => {
                setShowComposer(false);
                fetchPods();
                if (isConnected) fetchUserPods();
              }}
            />
          )}
        </AnimatePresence>
      </div>

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

// ─── Inline Pod Detail (§14.4) ──────────────────────────────────────
function PodDetailInline({
  pod,
  isOfficial,
  isConnected,
  isMember,
  isJoining,
  userBalance,
  onJoin,
  onEnter,
  onClose,
  onCreatorTap,
}: {
  pod: PodData;
  isOfficial: boolean;
  isConnected: boolean;
  isMember: boolean;
  isJoining: boolean;
  userBalance: bigint;
  onJoin: () => void;
  onEnter: () => void;
  onClose: () => void;
  onCreatorTap?: (address: string) => void;
}) {
  const navigate = useNavigate();
  const hasCost = pod.threshold > 0n;
  const canAfford = userBalance >= pod.threshold;

  // Join button state per §14.4
  let buttonContent: React.ReactNode;
  let buttonAction: (() => void) | undefined;
  let buttonDisabled = false;

  if (!isConnected) {
    buttonContent = 'Connect to Join';
    buttonAction = () => { onClose(); navigate('/connect'); };
  } else if (isMember) {
    buttonContent = 'Enter Pod →';
    buttonAction = onEnter;
  } else if (isJoining) {
    buttonContent = (
      <span className="flex items-center gap-2">
        <div className="h-4 w-4 border-2 border-white/[0.10] border-t-text-on-cyan rounded-full animate-spin" />
        Joining...
      </span>
    );
    buttonDisabled = true;
  } else if (hasCost && !canAfford) {
    buttonContent = `Requires ${formatExactAmount(pod.threshold)}+ QF`;
    buttonDisabled = true;
  } else if (hasCost) {
    buttonContent = `Join Pod · ${formatExactAmount(pod.threshold)} QF`;
    buttonAction = onJoin;
  } else {
    buttonContent = 'Join Pod';
    buttonAction = onJoin;
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, center on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-surface-3 border border-white/[0.08] rounded-t-xl md:rounded-xl md:max-w-modal w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/[0.10]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium"
                style={{ backgroundColor: `${getCategoryColor(pod.category)}15`, color: getCategoryColor(pod.category) }}
              >
                {pod.category}
              </span>
              {isOfficial && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-pill bg-badge-team/10 text-badge-team text-[10px] font-medium">
                  Official
                </span>
              )}
            </div>
            <h2 className="font-display text-h1 text-text-primary">{pod.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] active:scale-[0.96]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {pod.description && (
          <p className="text-body text-text-secondary mb-4">{pod.description}</p>
        )}

        {/* Economics strip */}
        <div className="flex items-center gap-6 mb-4 py-3 border-y border-white/[0.06]">
          <div>
            <p className="text-caption text-text-tertiary">Members</p>
            <p className="text-label text-text-primary">{pod.memberCount}</p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary">Entry</p>
            <p className="text-label text-text-primary">
              {hasCost ? `${formatExactAmount(pod.threshold)} QF` : 'Free'}
            </p>
          </div>
          {hasCost && isConnected && (
            <div>
              <p className="text-caption text-text-tertiary">Your balance</p>
              <p className={cn('text-label', canAfford ? 'text-cyan-primary' : 'text-error')}>
                {formatBalance(userBalance, 18, 1)} QF
                {!canAfford && ' — insufficient'}
              </p>
            </div>
          )}
        </div>

        {/* Creator — tappable → profile sheet */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onCreatorTap?.(pod.creator)}
            className="flex items-center gap-2 active:scale-[0.98]"
          >
            <Avatar address={pod.creator} size={24} className="shrink-0 w-5 h-5" />
            <span className="text-caption text-text-tertiary hover:text-text-secondary transition-colors">
              {pod.creator.slice(0, 6)}...{pod.creator.slice(-4)}
            </span>
          </button>
        </div>

        {/* Join button */}
        <button
          onClick={buttonAction}
          disabled={buttonDisabled}
          className={cn(
            'w-full h-11 rounded-xl text-label font-medium transition-colors active:scale-[0.98]',
            isMember
              ? 'bg-white/[0.04] border border-white/[0.08] text-text-primary hover:bg-white/[0.06]'
              : buttonDisabled
                ? 'bg-white/[0.04] text-text-tertiary cursor-not-allowed'
                : 'bg-cyan-primary text-text-on-cyan hover:bg-cyan-hover'
          )}
        >
          {buttonContent}
        </button>
      </motion.div>
    </>
  );
}
