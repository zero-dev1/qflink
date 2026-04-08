// src/components/layout/DetailPanel.tsx
// Contextual right-side panel — shows relevant info based on current route
// Collapsible: 280px expanded ↔ 36px collapsed strip with chevron toggle
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePodsStore } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { useMessagesStore } from '@/stores/messages';
import { Avatar } from '@/components/ui/Avatar';
import { getCategoryColor } from '@/lib/categories';
import { formatExactAmount } from '@/lib/utils';
import { reverseResolve } from '@/lib/qns';

const PANEL_EXPANDED = 280;
const PANEL_COLLAPSED = 36;
const SPRING = { type: 'spring' as const, damping: 28, stiffness: 260 };

export function DetailPanel() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  // Determine which panel to show based on route
  const panelContent = useMemo(() => {
    if (location.pathname.match(/^\/pod\/\d+/)) return 'pod';
    if (location.pathname.startsWith('/dm/')) return 'dm';
    if (location.pathname === '/messages') return 'messages';
    if (location.pathname === '/explore') return 'explore';
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname.match(/^\/creator\/\d+/)) return 'creator';
    if (location.pathname === '/home') return 'home';
    return 'home';
  }, [location.pathname]);

  return (
    <motion.aside
      className="hidden lg:flex h-screen shrink-0 flex-col border-l border-white/[0.06] bg-white/[0.01] overflow-hidden relative"
      animate={{ width: expanded ? PANEL_EXPANDED : PANEL_COLLAPSED }}
      transition={SPRING}
    >
      {/* Collapse/expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="absolute top-3 left-2 z-10 w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] transition-colors active:scale-[0.96]"
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
      >
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      {/* Panel content — only rendered when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="flex-1 overflow-y-auto mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={panelContent}
                className="flex-1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {panelContent === 'pod' && <PodDetailContent />}
                {panelContent === 'dm' && <DMDetailContent />}
                {panelContent === 'home' && <HomeDetailContent />}
                {panelContent === 'explore' && <ExploreDetailContent />}
                {panelContent === 'messages' && <MessagesDetailContent />}
                {panelContent === 'profile' && <ProfileDetailContent />}
                {panelContent === 'creator' && <CreatorDetailContent />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

// ─── Pod chat detail ─────────────────────────────────────────────────
function PodDetailContent() {
  const location = useLocation();
  const pods = usePodsStore((s) => s.pods);
  const podMessagesMap = usePodsStore((s) => s.messages);
  const navigate = useNavigate();

  const podId = useMemo(() => {
    const match = location.pathname.match(/^\/pod\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }, [location.pathname]);

  const pod = useMemo(
    () => (podId !== null ? pods.find((p) => Number(p.id) === podId) : undefined),
    [pods, podId]
  );

  // Extract unique member addresses from messages (best available without contract enumerator)
  const memberAddresses = useMemo(() => {
    if (podId === null) return [];
    const msgs = podMessagesMap[podId] ?? [];
    const unique = new Set<string>();
    // Always include creator
    if (pod) unique.add(pod.creator.toLowerCase());
    for (const m of msgs) {
      if (!m.isLocalPending && !m.isFailed) unique.add(m.sender.toLowerCase());
    }
    return [...unique];
  }, [podId, podMessagesMap, pod]);

  if (!pod) return <EmptyDetail label="Pod not found" />;

  const hasCost = pod.threshold > 0n;

  return (
    <div className="p-4 space-y-5">
      {/* Pod header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-label font-bold text-white"
            style={{ backgroundColor: getCategoryColor(pod.category) }}
          >
            {pod.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-label text-text-primary font-medium truncate">{pod.name}</h3>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-pill text-[10px] font-medium mt-0.5"
              style={{ backgroundColor: `${getCategoryColor(pod.category)}15`, color: getCategoryColor(pod.category) }}
            >
              {pod.category}
            </span>
          </div>
        </div>
        {pod.description && (
          <p className="text-body-sm text-text-secondary mt-2">{pod.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Members" value={String(pod.memberCount)} />
        <StatCard label="Entry" value={hasCost ? `${formatExactAmount(pod.threshold)} QF` : 'Free'} />
      </div>

      {/* Creator */}
      <div>
        <p className="text-caption text-text-tertiary mb-2">Created by</p>
        <div className="flex items-center gap-2">
          <Avatar address={pod.creator} size={24} className="shrink-0" />
          <span className="text-caption text-text-secondary truncate">
            {pod.creator.slice(0, 6)}...{pod.creator.slice(-4)}
          </span>
        </div>
      </div>

      {/* Members list */}
      {memberAddresses.length > 0 && (
        <div>
          <p className="text-caption text-text-tertiary mb-2">
            {memberAddresses.length} active {memberAddresses.length === 1 ? 'member' : 'members'}
          </p>
          <MembersList addresses={memberAddresses} />
        </div>
      )}

      {/* Quick links */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          onClick={() => navigate('/explore')}
          className="w-full text-left text-caption text-cyan-primary hover:text-cyan-hover transition-colors py-1.5"
        >
          ← Back to Explore
        </button>
      </div>
    </div>
  );
}

// ─── Virtualized members list ───────────────────────────────────────
function MembersList({ addresses }: { addresses: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  // Resolve QNS names for visible members
  useEffect(() => {
    let cancelled = false;
    const unresolved = addresses.filter((a) => !(a in names));
    if (unresolved.length === 0) return;

    // Batch resolve in chunks of 10
    const batch = unresolved.slice(0, 10);
    Promise.allSettled(
      batch.map(async (addr) => {
        const name = await reverseResolve(addr);
        return { addr, name };
      })
    ).then((results) => {
      if (cancelled) return;
      const updates: Record<string, string> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          updates[r.value.addr] = r.value.name || '';
        }
      }
      setNames((prev) => ({ ...prev, ...updates }));
    });
    return () => { cancelled = true; };
  }, [addresses, names]);

  const virtualizer = useVirtualizer({
    count: addresses.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  // Only virtualize if many members — simple list otherwise
  if (addresses.length <= 20) {
    return (
      <div className="space-y-0.5 max-h-[240px] overflow-y-auto scrollbar-hide">
        {addresses.map((addr) => (
          <MemberRow key={addr} address={addr} name={names[addr] || undefined} />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-h-[240px] overflow-y-auto scrollbar-hide">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const addr = addresses[row.index];
          return (
            <div
              key={addr}
              ref={virtualizer.measureElement}
              data-index={row.index}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}
            >
              <MemberRow address={addr} name={names[addr] || undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ address, name }: { address: string; name?: string }) {
  const displayName = name
    ? (name.endsWith('.qf')
      ? <>{name.slice(0, -3)}<span className="text-cyan-primary">.qf</span></>
      : name)
    : `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-white/[0.03] transition-colors cursor-default">
      <Avatar address={address} size={24} className="shrink-0" />
      <span className="text-caption text-text-secondary truncate">{displayName}</span>
    </div>
  );
}

// ─── DM detail ───────────────────────────────────────────────────────
function DMDetailContent() {
  const location = useLocation();
  const address = useMemo(() => {
    const match = location.pathname.match(/^\/dm\/(.+)/);
    return match ? match[1].toLowerCase() : null;
  }, [location.pathname]);

  if (!address) return <EmptyDetail label="No conversation selected" />;

  return (
    <div className="p-4 space-y-5">
      <div className="flex flex-col items-center text-center pt-4">
        <Avatar address={address} size={48} className="mb-3" />
        <p className="text-label text-text-primary font-mono text-body-sm">
          {address.slice(0, 8)}...{address.slice(-6)}
        </p>
        <p className="text-caption text-text-tertiary mt-1">Direct message</p>
      </div>

      <div className="pt-3 border-t border-white/[0.06]">
        <p className="text-caption text-text-tertiary">
          Messages are stored on-chain. All conversations are transparent unless encrypted.
        </p>
      </div>
    </div>
  );
}

// ─── Home detail ─────────────────────────────────────────────────────
function HomeDetailContent() {
  const pods = usePodsStore((s) => s.pods);
  const userPodIds = usePodsStore((s) => s.userPodIds);
  const isConnected = useWalletStore((s) => s.isConnected);
  const navigate = useNavigate();

  const stats = useMemo(() => ({
    totalPods: pods.length,
    totalMembers: pods.reduce((s, p) => s + p.memberCount, 0),
    yourPods: userPodIds.length,
  }), [pods, userPodIds]);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-label text-text-primary font-medium">Network</h3>
        <p className="text-caption text-text-tertiary mt-1">QFLink activity overview</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <StatCard label="Total Pods" value={String(stats.totalPods)} />
        <StatCard label="Total Members" value={String(stats.totalMembers)} />
        {isConnected && <StatCard label="Your Pods" value={String(stats.yourPods)} />}
      </div>

      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <button
          onClick={() => navigate('/explore')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-cyan-primary shrink-0">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 7.5L9 9L7.5 12.5L11 11L12.5 7.5Z" fill="currentColor" />
          </svg>
          <span className="text-label text-text-secondary">Explore pods</span>
        </button>
        <button
          onClick={() => navigate('/messages')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-cyan-primary shrink-0">
            <path d="M3 4H17V14H11L7 18V14H3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="text-label text-text-secondary">Messages</span>
        </button>
      </div>
    </div>
  );
}

// ─── Explore detail ──────────────────────────────────────────────────
function ExploreDetailContent() {
  const pods = usePodsStore((s) => s.pods);

  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pod of pods) {
      map[pod.category] = (map[pod.category] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [pods]);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-label text-text-primary font-medium">Categories</h3>
        <p className="text-caption text-text-tertiary mt-1">{pods.length} total pods</p>
      </div>

      <div className="space-y-1.5">
        {categoryStats.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(cat) }}
            />
            <span className="text-label text-text-secondary flex-1">{cat}</span>
            <span className="text-caption text-text-tertiary">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Messages detail ─────────────────────────────────────────────────
function MessagesDetailContent() {
  const conversations = useMessagesStore((s) => s.conversations);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-label text-text-primary font-medium">Conversations</h3>
        <p className="text-caption text-text-tertiary mt-1">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>

      <div className="pt-2 border-t border-white/[0.06]">
        <p className="text-caption text-text-tertiary">
          All messages are stored on-chain. Search for a .qf name to start a new conversation.
        </p>
      </div>
    </div>
  );
}

// ─── Profile detail ──────────────────────────────────────────────────
function ProfileDetailContent() {
  const qnsName = useWalletStore((s) => s.qnsName);
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-label text-text-primary font-medium">Settings</h3>
        <p className="text-caption text-text-tertiary mt-1">Manage your identity</p>
      </div>

      {!qnsName && (
        <div className="rounded-lg bg-white/[0.02] border border-cyan-border p-3">
          <p className="text-body-sm text-text-secondary">
            Claim your <span className="text-cyan-primary">.qf</span> name
          </p>
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-caption text-cyan-primary hover:text-cyan-hover transition-colors"
          >
            dotqf.xyz →
          </a>
        </div>
      )}

      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <button
          onClick={() => navigate('/home')}
          className="w-full text-left text-caption text-text-secondary hover:text-text-primary transition-colors py-1.5"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── Creator dashboard detail ───────────────────────────────────────
function CreatorDetailContent() {
  const navigate = useNavigate();
  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-label text-text-primary font-medium">Pod Management</h3>
        <p className="text-caption text-text-tertiary mt-1">Configure your pod settings</p>
      </div>
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <button
          onClick={() => navigate('/explore')}
          className="w-full text-left text-caption text-cyan-primary hover:text-cyan-hover transition-colors py-1.5"
        >
          ← Back to Explore
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
      <p className="text-caption text-text-tertiary">{label}</p>
      <p className="text-label text-text-primary mt-0.5">{value}</p>
    </div>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <p className="text-body-sm text-text-tertiary text-center">{label}</p>
    </div>
  );
}
