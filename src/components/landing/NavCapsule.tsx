// src/components/landing/NavCapsule.tsx
import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { useWalletStore } from '@/stores/wallet';

interface NavCapsuleProps {
  /** Ref to the scroll container (the snap-container div) */
  scrollRef: React.RefObject<HTMLElement>;
  /** Total number of sections (used to detect final section) */
  totalSections?: number;
}

export function NavCapsule({ scrollRef, totalSections = 5 }: NavCapsuleProps) {
  const { isConnected } = useWalletStore();
  const [opacity, setOpacity] = useState(1);

  const { scrollYProgress } = useScroll({ container: scrollRef });

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    // Fade to 60% in middle sections (roughly 20%–80% of scroll)
    // Full opacity at top (section 1) and bottom (section 5)
    const lastSectionStart = (totalSections - 1) / totalSections;
    if (progress < 0.05 || progress > lastSectionStart) {
      setOpacity(1);
    } else {
      setOpacity(0.6);
    }
  });

  const ctaPath = isConnected ? '/home' : '/connect';

  return (
    <motion.nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[360px] px-4 md:px-0"
      animate={{ opacity }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-5 h-12 flex items-center justify-between">
        {/* Wordmark */}
        <Link to="/" className="text-label font-display font-semibold select-none">
          QF<span className="text-cyan-primary">Link</span>
        </Link>

        {/* Enter App button — round pill, cyan fill */}
        <Link
          to={ctaPath}
          className="h-8 px-5 rounded-full bg-cyan-primary text-text-on-cyan text-body-sm font-medium inline-flex items-center justify-center hover:bg-cyan-hover active:bg-cyan-pressed transition-colors"
        >
          Enter App
        </Link>
      </div>
    </motion.nav>
  );
}
