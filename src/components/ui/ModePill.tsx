// src/components/ui/ModePill.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore, type InstantDuration } from '@/stores/mode';
import { cn } from '@/lib/utils';

const DURATIONS: { label: string; value: InstantDuration }[] = [
  { label: '5m', value: '5m' },
  { label: '30m', value: '30m' },
  { label: '2h', value: '2h' },
  { label: '24h', value: '24h' },
];

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

export function ModePill() {
  const {
    instantActive,
    privacyActive,
    activateInstant,
    deactivateInstant,
    togglePrivacy,
    getInstantRemaining,
    isInstantExpired,
  } = useModeStore();

  const [showPicker, setShowPicker] = useState(false);
  const [remaining, setRemaining] = useState('');

  // Countdown timer
  useEffect(() => {
    if (!instantActive) return;
    const tick = () => {
      const ms = getInstantRemaining();
      if (ms <= 0) {
        deactivateInstant();
        return;
      }
      setRemaining(formatRemaining(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [instantActive, getInstantRemaining, deactivateInstant]);

  const handleInstantTap = () => {
    if (instantActive) {
      deactivateInstant();
    } else {
      setShowPicker((p) => !p);
    }
  };

  const handleDurationSelect = (duration: InstantDuration) => {
    activateInstant(duration);
    setShowPicker(false);
  };

  const bothActive = instantActive && privacyActive;

  return (
    <div className="relative flex justify-center pointer-events-none z-30">
      <motion.div
        layout
        className={cn(
          'pointer-events-auto inline-flex items-center rounded-pill border backdrop-blur-xl transition-colors duration-300',
          bothActive
            ? 'bg-cyan-muted border-cyan-border shadow-[0_0_12px_rgba(6,182,212,0.15)]'
            : 'bg-white/[0.03] border-white/[0.06]'
        )}
      >
        {/* Instant side */}
        <button
          onClick={handleInstantTap}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-l-pill transition-all duration-200 active:scale-[0.97]',
            instantActive
              ? 'text-cyan-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
          aria-label={instantActive ? 'Deactivate instant mode' : 'Activate instant mode'}
        >
          <span className="text-sm">⚡</span>
          {instantActive && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-caption font-medium whitespace-nowrap"
            >
              {remaining}
            </motion.span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Privacy side */}
        <button
          onClick={togglePrivacy}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-r-pill transition-all duration-200 active:scale-[0.97]',
            privacyActive
              ? 'text-cyan-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
          aria-label={privacyActive ? 'Deactivate privacy mode' : 'Activate privacy mode'}
        >
          <span className="text-sm">{privacyActive ? '🔒' : '🔓'}</span>
        </button>
      </motion.div>

      {/* Duration picker dropdown */}
      <AnimatePresence>
        {showPicker && !instantActive && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto absolute top-full mt-2 flex items-center gap-1 rounded-pill bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-1"
          >
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => handleDurationSelect(d.value)}
                className="h-7 px-3 rounded-pill text-caption font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors active:scale-[0.96]"
              >
                {d.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
