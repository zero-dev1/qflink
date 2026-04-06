// src/components/layout/MobileTabBar.tsx
// 4 items: Home, Explore, Messages, user avatar (28px badge ring, no text label)
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useUnreadStore } from '@/stores/unread';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const { isConnected, evmAddress } = useWalletStore();
  const totalUnreadDMs = useUnreadStore((s) => s.getTotalUnreadDMs());
  const totalUnreadPods = useUnreadStore((s) => s.getTotalUnreadPods());
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base/80 backdrop-blur-md border-t border-white/[0.04] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {/* Home */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            cn(
              'relative flex items-center justify-center w-12 h-12 active:scale-[0.96]',
              isActive ? 'text-cyan-primary' : 'text-text-tertiary'
            )
          }
          aria-label="Home"
        >
          {({ isActive }) => (
            <>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 11L11 3L19 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 10V18H17V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {totalUnreadPods > 0 && (
                <UnreadDot className="absolute top-1 right-1" />
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute -bottom-0.5 w-5 h-0.5 bg-cyan-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </>
          )}
        </NavLink>

        {/* Explore */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              'relative flex items-center justify-center w-12 h-12 active:scale-[0.96]',
              isActive ? 'text-cyan-primary' : 'text-text-tertiary'
            )
          }
          aria-label="Explore"
        >
          {({ isActive }) => (
            <>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 8L10 10L8 14L12 12L14 8Z" fill="currentColor" />
              </svg>
              {isActive && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute -bottom-0.5 w-5 h-0.5 bg-cyan-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </>
          )}
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            cn(
              'relative flex items-center justify-center w-12 h-12 active:scale-[0.96]',
              isActive ? 'text-cyan-primary' : 'text-text-tertiary'
            )
          }
          aria-label="Messages"
        >
          {({ isActive }) => (
            <>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 4H19V15H12L8 19V15H3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="16" cy="7" r="1" fill="currentColor" opacity="0.4" />
              </svg>
              {totalUnreadDMs > 0 && (
                <UnreadDot count={totalUnreadDMs} showCount size="sm" className="absolute top-0.5 right-0" />
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute -bottom-0.5 w-5 h-0.5 bg-cyan-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </>
          )}
        </NavLink>

        {/* User avatar — no text label */}
        {isConnected && evmAddress ? (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center w-12 h-12 active:scale-[0.96]',
              )
            }
            aria-label="Profile"
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'w-7 h-7 rounded-full overflow-hidden border-2 transition-colors',
                    isActive ? 'border-cyan-primary' : 'border-cyan-border'
                  )}
                >
                  <Avatar address={evmAddress} size={32} className="w-full h-full" />
                </div>
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute -bottom-0.5 w-5 h-0.5 bg-cyan-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ) : (
          <button
            onClick={() => navigate('/connect')}
            className="relative flex items-center justify-center w-12 h-12 text-text-tertiary active:scale-[0.96]"
            aria-label="Connect"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 20C3 16 6.5 13 11 13C15.5 13 19 16 19 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
}
