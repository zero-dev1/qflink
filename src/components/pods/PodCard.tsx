// src/components/pods/PodCard.tsx
// Design System §14.3 — Pod Card Anatomy
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { PodData } from '@/stores/pods';
import { formatExactAmount } from '@/lib/utils';
import { getCategoryColor } from '@/lib/categories';
import { BADGE_TYPES } from '@/lib/badges';

interface PodCardProps {
  pod: PodData;
  isOfficial?: boolean;
  onClick: () => void;
}

export function PodCard({ pod, isOfficial = false, onClick }: PodCardProps) {
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

  // Strip color: official = badge color (team/dapplab), community = category color
  const stripColor = isOfficial
    ? BADGE_TYPES.team.color
    : getCategoryColor(pod.category);

  // Economics display per §14.3
  const hasFee = pod.threshold > 0n;
  const hasGate = pod.minBalance > 0n;
  const feeDisplay = hasFee ? `${formatExactAmount(pod.threshold)} QF` : null;
  const gateDisplay = hasGate ? `🔒 ${formatExactAmount(pod.minBalance)}+ QF` : null;

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

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`${pod.name}${isOfficial ? ', Official' : ''} — ${pod.category}, ${pod.memberCount} members, ${economicsText}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/[0.12] transition-colors overflow-hidden active:scale-[0.98]"
      onClick={onClick}
    >
      {/* Top strip — 4px color */}
      <div className="h-1" style={{ backgroundColor: stripColor }} />

      <div className="p-4 flex flex-col h-full min-h-[140px]">
        {/* Category chip */}
        <div className="mb-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium"
            style={{
              backgroundColor: `${getCategoryColor(pod.category)}15`,
              color: getCategoryColor(pod.category),
            }}
          >
            {pod.category}
          </span>
        </div>

        {/* Name + Official chip */}
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-h3 font-sans font-semibold text-text-primary truncate">
            {pod.name}
          </h3>
          {isOfficial && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-pill bg-badge-team/10 text-badge-team text-[10px] font-medium shrink-0">
              Official
            </span>
          )}
        </div>

        {/* Description — one line truncated */}
        {pod.description && (
          <p className="text-body-sm text-text-secondary truncate mb-auto">
            {pod.description}
          </p>
        )}
        {!pod.description && <div className="mb-auto" />}

        {/* Bottom row — members + economics */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-caption text-text-tertiary">
            👥 {pod.memberCount} members
          </span>
          <span className="text-caption text-text-secondary">
            {economicsText}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
