import { AnimatePresence, motion } from 'framer-motion';
import { PodData } from '@/stores/pods';
import { formatCompactBalance } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface PodDetailModalProps {
  pod: PodData | null;
  onClose: () => void;
  isUserMember: boolean;
  isJoining: boolean;
  onJoin: () => void;
  onEnter: () => void;
}

export function PodDetailModal({ 
  pod, 
  onClose, 
  isUserMember, 
  isJoining, 
  onJoin, 
  onEnter 
}: PodDetailModalProps) {
  if (!pod) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-overlay z-50"
        onClick={onClose}
      >
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-surface-4 border border-border-medium rounded-lg max-w-modal w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end mb-4">
              <Button variant="icon" onClick={onClose}>
                ×
              </Button>
            </div>

            {/* Pod name */}
            <h1 className="text-h1 font-display text-text-primary">
              {pod.name}
            </h1>

            {/* Description */}
            <p className="text-body text-text-secondary mt-3">
              {pod.description}
            </p>

            {/* Stats row */}
            <div className="mt-4 flex gap-6">
              <div>
                <div className="text-caption text-text-tertiary">Members</div>
                <div className="text-label text-text-primary">{pod.memberCount}</div>
              </div>
              <div>
                <div className="text-caption text-text-tertiary">Category</div>
                <div className="text-label text-text-primary capitalize">{pod.category}</div>
              </div>
              <div>
                <div className="text-caption text-text-tertiary">Entry Fee</div>
                <div className="text-label text-text-primary">
                  {pod.threshold > 0n ? formatCompactBalance(pod.threshold) : 'Free'}
                </div>
              </div>
            </div>

            {/* Threshold requirement */}
            {pod.threshold > 0n && (
              <div className="mt-4 text-body-sm text-cyan-primary">
                Requires {formatCompactBalance(pod.threshold)} QF to join
              </div>
            )}

            {/* Creator */}
            <div className="mt-4 text-caption text-text-tertiary">
              Created by {pod.creator.slice(0, 6)}...{pod.creator.slice(-4)}
            </div>

            {/* Action button */}
            <div className="mt-6 w-full">
              {isUserMember ? (
                <Button variant="primary" onClick={onEnter} className="w-full">
                  Enter Pod
                </Button>
              ) : isJoining ? (
                <Button variant="primary" disabled className="w-full">
                  <div className="flex items-center justify-center">
                    <div className="animate-shimmer bg-gradient-to-r from-cyan-primary via-cyan-hover to-cyan-primary bg-[length:200%_100%] w-16 h-4 rounded mr-2"></div>
                    Joining...
                  </div>
                </Button>
              ) : (
                <Button variant="primary" onClick={onJoin} className="w-full">
                  Join Pod
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
