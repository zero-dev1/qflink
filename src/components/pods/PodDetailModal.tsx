// src/components/pods/PodDetailModal.tsx
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PodData } from '@/stores/pods';
import { formatCompactBalance } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface PodDetailModalProps {
  pod: PodData | null;
  onClose: () => void;
  isConnected: boolean;
  isUserMember: boolean;
  isJoining: boolean;
  onJoin: () => void;
  onEnter: () => void;
}

export function PodDetailModal({
  pod,
  onClose,
  isConnected,
  isUserMember,
  isJoining,
  onJoin,
  onEnter,
}: PodDetailModalProps) {
  const navigate = useNavigate();

  if (!pod) return null;

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-overlay z-50"
      onClick={onClose}
    >
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-surface-4 border border-white/[0.06] rounded-t-xl md:rounded-xl z-50 w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 max-h-[85vh] overflow-y-auto md:max-w-modal fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/[0.10]" />
          </div>
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <Button variant="icon" onClick={onClose} aria-label="Close">
              ×
            </Button>
          </div>

          {/* Pod name */}
          <h1 className="text-h1 font-display text-text-primary">{pod.name}</h1>

          {/* Description */}
          <p className="text-body text-text-secondary mt-3">{pod.description}</p>

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

          {/* Action button — 4 states */}
          <div className="mt-6 w-full">
            {!isConnected ? (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate('/connect');
                }}
                className="w-full"
              >
                Connect to Join
              </Button>
            ) : isUserMember ? (
              <Button variant="primary" onClick={onEnter} className="w-full">
                Enter Pod
              </Button>
            ) : isJoining ? (
              <Button variant="primary" disabled className="w-full">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/[0.10] border-t-text-on-cyan rounded-full animate-spin" />
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
  );
}
