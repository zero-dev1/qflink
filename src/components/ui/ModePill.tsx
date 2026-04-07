// src/components/ui/ModePill.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Lock, LockOpen } from 'lucide-react';
import { useModeStore, INSTANT_OPTIONS, type InstantDuration } from '@/stores/mode';
import { useWalletStore } from '@/stores/wallet';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/feedback';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ModePill() {
  const privacyActive = useModeStore((s) => s.privacyActive);
  const togglePrivacy = useModeStore((s) => s.togglePrivacy);
  const instantActive = useModeStore((s) => s.instantActive);
  const activateInstant = useModeStore((s) => s.activateInstant);
  const deactivateInstant = useModeStore((s) => s.deactivateInstant);
  const getInstantRemaining = useModeStore((s) => s.getInstantRemaining);
  const isInstantExpired = useModeStore((s) => s.isInstantExpired);

  const [expanded, setExpanded] = useState(false);
  const [countdown, setCountdown] = useState('');
  const pillRef = useRef<HTMLDivElement>(null);

  // §23 — Post-reconnect shimmer
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

  // Countdown tick when instant mode is active
  useEffect(() => {
    if (!instantActive) { setCountdown(''); return; }
    const tick = () => {
      const remaining = getInstantRemaining();
      if (remaining <= 0 || isInstantExpired()) {
        deactivateInstant();
        setCountdown('');
        return;
      }
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [instantActive, getInstantRemaining, isInstantExpired, deactivateInstant]);

  // Close expanded picker when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    // Delay to avoid immediate close from the same click
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick); };
  }, [expanded]);

  const handleInstantTap = useCallback(() => {
    if (shimmer) return;
    hapticTap();
    if (instantActive) {
      deactivateInstant();
      setExpanded(false);
    } else {
      setExpanded((prev) => !prev);
    }
  }, [shimmer, instantActive, deactivateInstant]);

  const handleDurationSelect = useCallback((duration: InstantDuration) => {
    hapticTap();
    activateInstant(duration);
    setExpanded(false);
  }, [activateInstant]);

  const handlePrivacyTap = useCallback(() => {
    if (shimmer) return;
    hapticTap();
    togglePrivacy();
  }, [shimmer, togglePrivacy]);

  // §8 — Scroll-aware background
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const content = document.getElementById('main-content');
    if (!content) return;
    const scrollEl = content.querySelector('.overflow-y-auto') || content;
    const onScroll = () => setScrolled((scrollEl as HTMLElement).scrollTop > 20);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = privacyActive || instantActive;

  return (
    <div className="relative flex justify-center pointer-events-none z-30">
      <motion.div
        ref={pillRef}
        layout
        transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 } }}
        className={cn(
          'pointer-events-auto inline-flex items-center rounded-pill border backdrop-blur-md relative overflow-hidden',
          shimmer && 'border-cyan-border',
          isConnecting && 'opacity-50',
          isActive
            ? 'bg-cyan-muted border-cyan-border shadow-[0_0_12px_rgba(6,182,212,0.15)]'
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

        {/* Instant mode button */}
        <button
          onClick={handleInstantTap}
          className={cn(
            'relative flex items-center gap-1.5 h-8 px-3 rounded-l-pill transition-all duration-200 active:scale-[0.97]',
            instantActive
              ? 'text-cyan-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
          aria-label={instantActive ? `Instant mode active — ${countdown} remaining. Tap to deactivate.` : 'Activate instant mode'}
        >
          <Zap size={14} strokeWidth={1.5} className={instantActive ? 'text-cyan-primary' : undefined} />
          {/* Show countdown when active */}
          <AnimatePresence mode="wait">
            {instantActive && countdown && (
              <motion.span
                key="countdown"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] font-medium tabular-nums text-cyan-primary overflow-hidden whitespace-nowrap"
              >
                {countdown}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Duration options — expand inside capsule */}
        <AnimatePresence>
          {expanded && !instantActive && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="flex items-center overflow-hidden"
            >
              {INSTANT_OPTIONS.map((opt, i) => (
                <motion.button
                  key={opt.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                  onClick={() => handleDurationSelect(opt.key)}
                  className="flex items-center h-6 px-2.5 mx-0.5 rounded-pill text-[11px] font-medium whitespace-nowrap transition-all duration-150 bg-white/[0.06] hover:bg-cyan-muted text-text-secondary hover:text-cyan-primary active:scale-[0.95]"
                >
                  {opt.label}
                </motion.button>
              ))}
              {/* Spacer before divider */}
              <div className="w-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Privacy / Encryption side */}
        <button
          onClick={handlePrivacyTap}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-r-pill transition-all duration-200 active:scale-[0.97]',
            privacyActive
              ? 'text-cyan-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
          aria-label={privacyActive ? 'Encryption on — tap to disable' : 'Encryption off — tap to enable'}
        >
          {privacyActive
            ? <Lock size={14} className="text-cyan-primary" strokeWidth={1.5} />
            : <LockOpen size={14} strokeWidth={1.5} />
          }
        </button>
      </motion.div>
    </div>
  );
}
