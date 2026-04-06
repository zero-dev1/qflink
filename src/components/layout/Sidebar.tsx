// src/components/layout/Sidebar.tsx
// Two-layer architecture: 56px rail + collapsible 240px context panel
import { useState } from 'react';
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useUnreadStore } from '@/stores/unread';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { getCategoryColor } from '@/lib/categories';
import { formatBalance, cn } from '@/lib/utils';

export function Sidebar() {
  const { isConnected, isConnecting, qnsName, evmAddress, balance, disconnect } = useWalletStore();
  const { pods, userPodIds } = usePodsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const totalUnreadDMs = useUnreadStore((s) => s.getTotalUnreadDMs());
  const [panelOpen, setPanelOpen] = useState(true);

  const userPods = pods.filter((p) => userPodIds.includes(Number(p.id)));

  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
      : null;

  const balanceDisplay = formatBalance(balance, 18, 1);

  return (
    <aside className="hidden md:flex h-screen shrink-0">
      {/* ─── Layer 1: Rail (56px) ─── */}
      <div className="w-14 h-full flex flex-col items-center bg-white/[0.02] backdrop-blur-md border-r border-white/[0.06] py-3 gap-1">
        {/* QFLink mark → Home */}
        <NavLink
          to={isConnected ? '/home' : '/'}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/[0.04] transition-colors active:scale-[0.96] mb-2"
          aria-label="Home"
        >
          <span className="font-display text-label text-cyan-primary font-bold">QF</span>
        </NavLink>

        {/* Pod icons */}
        <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto scrollbar-hide py-1">
          {userPods.length > 0 ? (
            userPods.map((pod) => {
              const isActive = location.pathname === `/pod/${pod.id}`;
              const catColor = getCategoryColor(pod.category);
              const hasUnread = useUnreadStore.getState().hasPodUnread(pod.id.toString());

              return (
                <NavLink
                  key={String(pod.id)}
                  to={`/pod/${pod.id}`}
                  className="relative group"
                  aria-label={pod.name}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-caption font-bold text-white transition-all active:scale-[0.96]',
                      isActive
                        ? 'ring-2 ring-cyan-primary ring-offset-2 ring-offset-base'
                        : 'hover:ring-1 hover:ring-white/[0.15]'
                    )}
                    style={{ backgroundColor: catColor }}
                  >
                    {pod.name[0]?.toUpperCase()}
                  </div>
                  {hasUnread && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-primary border-2 border-base" />
                  )}
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface-4 text-caption text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {pod.name}
                  </div>
                </NavLink>
              );
            })
          ) : (
            <button
              onClick={() => navigate('/explore')}
              className="w-10 h-10 rounded-full border border-dashed border-white/[0.10] flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:border-white/[0.20] transition-colors active:scale-[0.96]"
              aria-label="Join a pod"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Separator */}
        <div className="w-6 h-px bg-white/[0.06] my-1" />

        {/* Explore */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors active:scale-[0.96]',
              isActive ? 'bg-white/[0.06] text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03]'
            )
          }
          aria-label="Explore"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 7.5L9 9L7.5 12.5L11 11L12.5 7.5Z" fill="currentColor" />
          </svg>
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            cn(
              'relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors active:scale-[0.96]',
              isActive ? 'bg-white/[0.06] text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03]'
            )
          }
          aria-label="Messages"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 4H17V14H11L7 18V14H3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="14" cy="7" r="1" fill="currentColor" opacity="0.4" />
          </svg>
          {totalUnreadDMs > 0 && (
            <UnreadDot count={totalUnreadDMs} showCount size="sm" className="absolute -top-0.5 -right-0.5" />
          )}
        </NavLink>

        {/* Profile capsule at bottom — §23 pulsing border when reconnecting */}
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          {(isConnected || isConnecting) && evmAddress ? (
            <motion.button
              layoutId="profile-capsule"
              onClick={() => navigate('/profile')}
              className="relative group active:scale-[0.96]"
              aria-label={isConnecting ? 'Reconnecting...' : 'Profile'}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full overflow-hidden border-2 transition-colors',
                  isConnecting
                    ? 'border-cyan-primary animate-pulse-slow'
                    : 'border-cyan-border'
                )}
              >
                <Avatar
                  address={evmAddress}
                  size={48}
                  className={cn('w-full h-full', isConnecting && 'opacity-60')}
                />
              </div>
              {/* Collapsed tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface-4 text-caption text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {isConnecting ? 'Reconnecting...' : displayName}
              </div>
            </motion.button>
          ) : (
            <button
              onClick={() => navigate('/connect')}
              className="w-10 h-10 rounded-full bg-cyan-primary flex items-center justify-center text-text-on-cyan active:scale-[0.96]"
              aria-label="Connect wallet"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 5H14V13H2V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M4 5V3H12V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="11" cy="9" r="1" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ─── Layer 2: Context Panel (240px, collapsible) ─── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-full bg-white/[0.01] backdrop-blur-md border-r border-white/[0.04] overflow-hidden"
          >
            <div className="w-60 h-full flex flex-col">
              {/* Panel header */}
              <div className="px-4 h-14 flex items-center justify-between shrink-0">
                <span className="font-display text-h3 text-text-primary">
                  QF<span className="text-cyan-primary">Link</span>
                </span>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] transition-colors active:scale-[0.96]"
                  aria-label="Collapse panel"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Context content — changes by rail selection */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                <ContextPanelContent />
              </div>

              {/* Profile capsule (expanded) — §23 pulsing border when reconnecting */}
              {(isConnected || isConnecting) && evmAddress && (
                <div className="px-3 py-3 border-t border-white/[0.04]">
                  <button
                    onClick={() => navigate('/profile')}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-pill bg-white/[0.02] hover:bg-white/[0.04] transition-colors active:scale-[0.98] border',
                      isConnecting
                        ? 'border-cyan-primary animate-pulse-slow'
                        : 'border-cyan-border'
                    )}
                  >
                    <Avatar address={evmAddress} size={32} className="shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-label text-text-primary truncate">
                        {qnsName ? (
                          <>
                            {qnsName.replace('.qf', '')}
                            <span className="text-cyan-primary">.qf</span>
                          </>
                        ) : (
                          displayName
                        )}
                      </p>
                    </div>
                    <span className="text-caption text-text-secondary whitespace-nowrap">
                      {balanceDisplay} QF
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand button when collapsed */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute left-14 top-3 w-5 h-10 flex items-center justify-center text-text-tertiary hover:text-text-secondary z-10"
          aria-label="Expand panel"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </aside>
  );
}

// ─── Context panel content ──────────────────────────────────────────
function ContextPanelContent() {
  const location = useLocation();
  const { pods, userPodIds } = usePodsStore();
  const navigate = useNavigate();

  // Pod chat context — show member count / pod info
  const podMatch = location.pathname.match(/^\/pod\/(\d+)/);
  if (podMatch) {
    const podId = parseInt(podMatch[1]);
    const pod = pods.find((p) => Number(p.id) === podId);
    if (pod) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-label text-text-primary font-medium">{pod.name}</h3>
            <p className="text-caption text-text-tertiary mt-1">{pod.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2 text-caption text-text-secondary">
            <span>{pod.memberCount} members</span>
            <span>·</span>
            <span>{pod.category}</span>
          </div>
        </div>
      );
    }
  }

  // Messages context — conversation list
  if (location.pathname.startsWith('/messages') || location.pathname.startsWith('/dm/')) {
    return (
      <div>
        <p className="text-caption text-text-tertiary mb-2">Conversations</p>
        <p className="text-body-sm text-text-secondary">
          Use the Messages tab to view conversations
        </p>
      </div>
    );
  }

  // Default — your pods list
  const userPods = pods.filter((p) => userPodIds.includes(Number(p.id)));
  return (
    <div>
      <p className="text-caption text-text-tertiary mb-2">Your Pods</p>
      {userPods.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {userPods.map((pod) => (
            <button
              key={String(pod.id)}
              onClick={() => navigate(`/pod/${pod.id}`)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors active:scale-[0.98]',
                location.pathname === `/pod/${pod.id}`
                  ? 'bg-white/[0.04] text-text-primary'
                  : 'text-text-secondary hover:bg-white/[0.02] hover:text-text-primary'
              )}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ backgroundColor: getCategoryColor(pod.category) }}
              >
                {pod.name[0]?.toUpperCase()}
              </div>
              <span className="text-label truncate">{pod.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-text-tertiary">
          No pods yet. Explore to find one.
        </p>
      )}
    </div>
  );
}
