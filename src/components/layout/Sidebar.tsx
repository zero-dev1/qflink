// src/components/layout/Sidebar.tsx
// Unified single-surface sidebar — collapses from 280px to 64px as ONE element
import { useState, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useUnreadStore } from '@/stores/unread';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { getCategoryColor } from '@/lib/categories';
import { formatBalance, cn } from '@/lib/utils';

const SIDEBAR_EXPANDED = 280;
const SIDEBAR_COLLAPSED = 64;
const SPRING = { type: 'spring' as const, damping: 28, stiffness: 260 };

export function Sidebar() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const isConnecting = useWalletStore((s) => s.isConnecting);
  const qnsName = useWalletStore((s) => s.qnsName);
  const evmAddress = useWalletStore((s) => s.evmAddress);
  const balance = useWalletStore((s) => s.balance);

  const pods = usePodsStore((s) => s.pods);
  const userPodIds = usePodsStore((s) => s.userPodIds);
  const navigate = useNavigate();
  const location = useLocation();
  const totalUnreadDMs = useUnreadStore((s) => s.getTotalUnreadDMs());
  const unreadPodCounts = useUnreadStore((s) => s.unreadPodCounts);
  const [expanded, setExpanded] = useState(true);

  const userPods = useMemo(
    () => pods.filter((p) => userPodIds.includes(Number(p.id))),
    [pods, userPodIds]
  );

  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
      : null;

  const balanceDisplay = formatBalance(balance, 18, 1);

  return (
    <motion.aside
      className="hidden md:flex h-screen shrink-0 flex-col bg-white/[0.02] backdrop-blur-md border-r border-white/[0.06] overflow-hidden relative"
      animate={{ width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
      transition={SPRING}
    >
      {/* ─── Header ─── */}
      <div className={cn('shrink-0 flex items-center h-14 px-3 gap-2')}>
        <NavLink
          to={isConnected ? '/home' : '/'}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/[0.04] transition-colors active:scale-[0.96] shrink-0"
          aria-label="Home"
        >
          <span className="font-display text-label text-cyan-primary font-bold">QF</span>
        </NavLink>
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="flex items-center justify-between flex-1 min-w-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="font-display text-h3 text-text-primary whitespace-nowrap">
                QF<span className="text-cyan-primary">Link</span>
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] transition-colors active:scale-[0.96] shrink-0"
                aria-label="Collapse sidebar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute top-3 right-1 w-5 h-10 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors z-10"
            aria-label="Expand sidebar"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ─── Pod list — icons in collapsed, full rows in expanded ─── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2">
        {expanded && (
          <motion.p
            className="text-caption text-text-tertiary mb-2 px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            Your Pods
          </motion.p>
        )}
        <div className={cn('flex flex-col', expanded ? 'gap-0.5' : 'items-center gap-1.5')}>
          {userPods.length > 0 ? (
            userPods.map((pod) => {
              const isActive = location.pathname === `/pod/${pod.id}`;
              const catColor = getCategoryColor(pod.category);
              const hasUnread = (unreadPodCounts[pod.id.toString()] || 0) > 0;

              return expanded ? (
                <NavLink
                  key={String(pod.id)}
                  to={`/pod/${pod.id}`}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors active:scale-[0.98]',
                    isActive
                      ? 'bg-white/[0.06] text-text-primary'
                      : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ backgroundColor: catColor }}
                    >
                      {pod.name[0]?.toUpperCase()}
                    </div>
                    {hasUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-primary border-2 border-base" />
                    )}
                  </div>
                  <span className="text-label truncate flex-1">{pod.name}</span>
                  {hasUnread && (
                    <div className="w-2 h-2 rounded-full bg-cyan-primary shrink-0" />
                  )}
                </NavLink>
              ) : (
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
                  {/* Tooltip — collapsed only */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface-4 text-caption text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {pod.name}
                  </div>
                </NavLink>
              );
            })
          ) : (
            <button
              onClick={() => navigate('/explore')}
              className={cn(
                'rounded-full border border-dashed border-white/[0.10] flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:border-white/[0.20] transition-colors active:scale-[0.96]',
                expanded ? 'w-full h-10 rounded-lg gap-2' : 'w-10 h-10'
              )}
              aria-label="Join a pod"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {expanded && <span className="text-caption">Join a pod</span>}
            </button>
          )}
        </div>
      </div>

      {/* ─── Bottom nav: Explore + Messages ─── */}
      <div className={cn('shrink-0 px-3 py-2 border-t border-white/[0.06] flex flex-col', expanded ? 'gap-0.5' : 'items-center gap-1.5')}>
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg transition-colors active:scale-[0.96]',
              expanded ? 'px-2.5 py-2' : 'w-10 h-10 justify-center',
              isActive ? 'bg-white/[0.06] text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03]'
            )
          }
          aria-label="Explore"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 7.5L9 9L7.5 12.5L11 11L12.5 7.5Z" fill="currentColor" />
          </svg>
          {expanded && <span className="text-label">Explore</span>}
        </NavLink>

        <NavLink
          to="/messages"
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-2.5 rounded-lg transition-colors active:scale-[0.96]',
              expanded ? 'px-2.5 py-2' : 'w-10 h-10 justify-center',
              isActive ? 'bg-white/[0.06] text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03]'
            )
          }
          aria-label="Messages"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
            <path d="M3 4H17V14H11L7 18V14H3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="14" cy="7" r="1" fill="currentColor" opacity="0.4" />
          </svg>
          {expanded && <span className="text-label flex-1">Messages</span>}
          {totalUnreadDMs > 0 && (
            expanded ? (
              <UnreadDot count={totalUnreadDMs} showCount size="sm" />
            ) : (
              <UnreadDot count={totalUnreadDMs} showCount size="sm" className="absolute -top-0.5 -right-0.5" />
            )
          )}
        </NavLink>
      </div>

      {/* ─── Profile capsule — single element that morphs ─── */}
      <div className={cn('shrink-0 border-t border-white/[0.06]', expanded ? 'px-3 py-3' : 'px-3 py-3 flex justify-center')}>
        {(isConnected || isConnecting) && evmAddress ? (
          <motion.button
            layoutId="profile-capsule"
            onClick={() => navigate('/profile')}
            className={cn(
              'flex items-center transition-colors active:scale-[0.98]',
              expanded
                ? 'w-full gap-2.5 px-2.5 py-2 rounded-pill bg-white/[0.02] hover:bg-white/[0.04] border'
                : 'w-10 h-10 justify-center rounded-full border-2',
              isConnecting
                ? 'border-cyan-primary animate-pulse-slow'
                : 'border-cyan-border'
            )}
            aria-label={isConnecting ? 'Reconnecting...' : 'Profile'}
          >
            <Avatar
              address={evmAddress}
              size={32}
              className={cn('shrink-0', !expanded && 'w-full h-full rounded-full', isConnecting && 'opacity-60')}
            />
            {expanded && (
              <>
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
              </>
            )}
            {/* Tooltip — collapsed only */}
            {!expanded && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface-4 text-caption text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {isConnecting ? 'Reconnecting...' : displayName}
              </div>
            )}
          </motion.button>
        ) : (
          <button
            onClick={() => navigate('/connect')}
            className={cn(
              'flex items-center justify-center bg-cyan-primary text-text-on-cyan active:scale-[0.96] transition-colors hover:bg-cyan-hover',
              expanded ? 'w-full h-10 rounded-pill gap-2 text-label font-medium' : 'w-10 h-10 rounded-full'
            )}
            aria-label="Connect wallet"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 5H14V13H2V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M4 5V3H12V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="11" cy="9" r="1" fill="currentColor" />
            </svg>
            {expanded && <span>Connect Wallet</span>}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
