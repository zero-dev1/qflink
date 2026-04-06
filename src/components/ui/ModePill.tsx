// src/components/ui/ModePill.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Lock, LockOpen } from 'lucide-react';
import { useModeStore } from '@/stores/mode';
import { useWalletStore } from '@/stores/wallet';
import { cn } from '@/lib/utils';

export function ModePill() {
  const { privacyActive, togglePrivacy } = useModeStore();

  const [showComingSoon, setShowComingSoon] = useState(false);

  // §23 — Post-reconnect shimmer: track isConnecting→isConnected transition
  const { isConnecting, isConnected } = useWalletStore();
  const wasConnecting = useRef(false);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => {
    if (isConnecting) {
      wasConnecting.current = true;
    } else if (wasConnecting.current && isConnected) {
      wasConnecting.current = false;
      setShimmer(true);
      const timer = setTimeout(() => setShimmer(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnecting, isConnected]);

  const handleInstantTap = () => {
    if (shimmer) return;
    // §Fix7 — Session key infra not implemented; show "Coming soon"
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  };

  const handlePrivacyTap = () => {
    if (shimmer) return;
    togglePrivacy();
  };

  // §8 — Scroll behavior: increase bg opacity on scroll to avoid fighting content
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const content = document.getElementById('main-content');
    if (!content) return;
    const scrollEl = content.querySelector('.overflow-y-auto') || content;
    const onScroll = () => setScrolled((scrollEl as HTMLElement).scrollTop > 20);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative flex justify-center pointer-events-none z-30">
      <motion.div
        layout
        className={cn(
          'pointer-events-auto inline-flex items-center rounded-pill border backdrop-blur-md transition-colors duration-300 relative overflow-hidden',
          shimmer && 'border-cyan-border',
          isConnecting && 'opacity-50',
          privacyActive
            ? 'bg-cyan-muted border-cyan-border shadow-[0_0_12px_rgba(0,239,231,0.15)]'
            : scrolled
              ? 'bg-white/[0.06] border-white/[0.08]'
              : 'bg-white/[0.03] border-white/[0.06]'
        )}
        title={shimmer ? 'Connecting to chain...' : undefined}
      >
        {/* §23 — Post-reconnect shimmer sweep */}
        {shimmer && (
          <motion.span
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-primary/15 to-transparent pointer-events-none z-10"
          />
        )}
        {/* Instant side — §Fix7: disabled, session keys not wired */}
        <button
          onClick={handleInstantTap}
          className="relative flex items-center gap-1.5 h-8 px-3 rounded-l-pill transition-all duration-200 active:scale-[0.97] text-text-tertiary hover:text-text-secondary"
          aria-label="Instant mode — coming soon"
        >
          <Zap size={14} className="text-text-tertiary" strokeWidth={1.5} />
          <AnimatePresence>
            {showComingSoon && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-text-tertiary bg-surface-4 px-2 py-0.5 rounded pointer-events-none z-20"
              >
                Coming soon
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Privacy side */}
        <button
          onClick={handlePrivacyTap}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-r-pill transition-all duration-200 active:scale-[0.97]',
            privacyActive
              ? 'text-cyan-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
          aria-label={privacyActive ? 'Deactivate privacy mode' : 'Activate privacy mode'}
        >
          {privacyActive ? <Lock size={14} className="text-cyan-primary" strokeWidth={1.5} /> : <LockOpen size={14} className="text-text-tertiary" strokeWidth={1.5} />}
        </button>
      </motion.div>

      {/* Duration picker removed — §Fix7: session keys not wired */}
    </div>
  );
}
