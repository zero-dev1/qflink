// src/components/pods/PodCard.tsx
// Design System §14.3 — Pod Card Anatomy
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { memo, useRef, useState, useCallback } from 'react';
import { Lock, Users } from 'lucide-react';
import { PodData } from '@/stores/pods';
import { formatExactAmount } from '@/lib/utils';
import { getCategoryColor } from '@/lib/categories';
import { BADGE_TYPES } from '@/lib/badges';

interface PodCardProps {
  pod: PodData;
  isOfficial?: boolean;
  onClick: () => void;
}

// Tilt sub-component - only mounts on hover, so springs only exist while hovering
function TiltWrapper({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [2, -2]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-2, 2]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/[0.12] transition-colors overflow-hidden active:scale-[0.98]"
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Static fallback - no motion overhead, used until first hover
function StaticWrapper({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/[0.12] transition-colors overflow-hidden active:scale-[0.98]"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export const PodCard = memo(function PodCard({ pod, isOfficial = false, onClick }: PodCardProps) {
  const [hasHovered, setHasHovered] = useState(false);

  const stripColor = isOfficial
    ? BADGE_TYPES.team.color
    : getCategoryColor(pod.category);

  const hasFee = pod.threshold > 0n;
  const hasGate = pod.minBalance > 0n;
  const feeDisplay = hasFee ? `${formatExactAmount(pod.threshold)} QF` : null;
  const gateDisplay = hasGate ? `${formatExactAmount(pod.minBalance)}+ QF` : null;

  let economicsText: string;
  if (feeDisplay && gateDisplay) {
    economicsText = `${feeDisplay} · ${gateDisplay}`;
  } else if (feeDisplay) {
    economicsText = feeDisplay;
  } else if (gateDisplay) {
    economicsText = `Free · ${gateDisplay}`;
  } else {
    economicsText = 'Free';
  }

  const ariaLabel = `${pod.name}${isOfficial ? ', Official' : ''} - ${pod.category}, ${pod.memberCount} members, ${economicsText}`;

  const cardContent = (
    <>
      <div className="h-1" style={{ backgroundColor: stripColor }} />
      <div className="p-4 flex flex-col h-full min-h-[140px]">
        <div className="mb-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium"
            style={{ backgroundColor: `${getCategoryColor(pod.category)}15`, color: getCategoryColor(pod.category) }}
          >
            {pod.category}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-h3 font-sans font-semibold text-text-primary truncate">{pod.name}</h3>
          {isOfficial && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-pill bg-badge-team/10 text-badge-team text-[10px] font-medium shrink-0">
              Official
            </span>
          )}
        </div>
        {pod.description && (
          <p className="text-body-sm text-text-secondary truncate mb-auto">{pod.description}</p>
        )}
        {!pod.description && <div className="mb-auto" />}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-caption text-text-tertiary inline-flex items-center gap-1">
            <Users size={12} strokeWidth={1.5} /> {pod.memberCount} members
          </span>
          <span className="text-caption text-text-secondary inline-flex items-center gap-1">
            {hasGate && <Lock size={11} strokeWidth={1.5} />}
            {economicsText}
          </span>
        </div>
      </div>
    </>
  );

  const Wrapper = hasHovered ? TiltWrapper : StaticWrapper;

  return (
    <div onMouseEnter={() => { if (!hasHovered) setHasHovered(true); }}>
      <Wrapper onClick={onClick} ariaLabel={ariaLabel}>
        {cardContent}
      </Wrapper>
    </div>
  );
});
