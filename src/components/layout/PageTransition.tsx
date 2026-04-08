// src/components/layout/PageTransition.tsx
// Spatial page transitions — each navigation has an origin point
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Determine transition direction based on navigation path
function getTransitionVariant(pathname: string, prevPath?: string) {
  // Pod chat — slides in from right (card expansion feel)
  if (pathname.startsWith('/pod/')) {
    return {
      initial: { opacity: 0, x: 40, scale: 0.98 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -20, scale: 0.98 },
    };
  }

  // DM chat — slides in from right
  if (pathname.startsWith('/dm/')) {
    return {
      initial: { opacity: 0, x: 40, scale: 0.98 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -20, scale: 0.98 },
    };
  }

  // Profile — slides up from bottom (avatar origin)
  if (pathname === '/profile') {
    return {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 12 },
    };
  }

  // Creator dashboard — slides in from right
  if (pathname.startsWith('/creator/')) {
    return {
      initial: { opacity: 0, x: 40 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    };
  }

  // Default — subtle fade + slight upward
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  };
}

const spring = {
  type: 'spring' as const,
  damping: 32,
  stiffness: 240,
  mass: 0.9,
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  const variant = useMemo(
    () => getTransitionVariant(location.pathname),
    [location.pathname]
  );

  return (
    <motion.div
      key={location.pathname}
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
      transition={spring}
      className="h-full"
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
