// src/components/ui/ProfileSheet.tsx
// Design System §18.2 — Universal component opened by tapping any avatar
// Mobile: bottom sheet with spring physics, drag handle, backdrop blur
// Desktop: panel overlay with backdrop blur
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, LockOpen } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { reverseResolve } from '@/lib/qns';
import { getBadgesForName, type UserBadge } from '@/lib/badges';
import { cn } from '@/lib/utils';

interface ProfileSheetProps {
  address: string;
  isOpen: boolean;
  onClose: () => void;
  // Pod context — adds promote/ban actions
  podContext?: {
    podId: number;
    isCreatorOrMod: boolean;
  };
}

export function ProfileSheet({ address, isOpen, onClose, podContext }: ProfileSheetProps) {
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [encryptionSupported, setEncryptionSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lower = address.toLowerCase();

  // Load profile data
  useEffect(() => {
    if (!isOpen || !address) return;
    setIsLoading(true);

    const loadData = async () => {
      // Name
      try {
        const resolved = await reverseResolve(lower);
        setName(resolved);

        // Badges
        if (resolved) {
          const b = await getBadgesForName(resolved);
          setBadges(b);
        }
      } catch {}

      // Encryption support
      try {
        const { getProfile } = await import('@/lib/contractCalls');
        const profile = await getProfile(lower as `0x${string}`);
        const hasPubkey = profile?.encryptionPubkey && profile.encryptionPubkey !== '0x' && !/^0x0+$/.test(profile.encryptionPubkey);
        setEncryptionSupported(!!hasPubkey);
      } catch {}

      setIsLoading(false);
    };

    loadData();
  }, [isOpen, address, lower]);

  const handleMessage = () => {
    onClose();
    navigate(`/dm/${lower}`);
  };

  const firstName = name ? name.replace('.qf', '') : null;
  const badgeColor = badges.length > 0 ? badges[0].color : '#00EFE7';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={onClose}
            role="button"
            aria-label="Close profile sheet"
          />

          {/* Sheet — bottom sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[71] bg-surface-3 border border-white/[0.08] rounded-t-xl md:rounded-xl md:max-w-sm w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/[0.10]" />
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full overflow-hidden border-[3px] mb-3"
                style={{ borderColor: badgeColor }}
              >
                <Avatar address={lower} size={80} className="w-full h-full" />
              </div>

              {isLoading ? (
                <div className="h-5 w-24 bg-white/[0.04] rounded animate-pulse" />
              ) : (
                <p className="text-label text-text-primary">
                  {firstName ? (
                    <>{firstName}<span className="text-cyan-primary">.qf</span></>
                  ) : (
                    `${lower.slice(0, 6)}...${lower.slice(-4)}`
                  )}
                </p>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                  {badges.map((badge) => (
                    <span
                      key={badge.type}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium"
                      style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Encryption support */}
              <p className="mt-2 text-caption text-text-tertiary">
                {encryptionSupported ? <><Lock size={12} className="inline -mt-0.5 mr-1" strokeWidth={1.5} />Supports encrypted DMs</> : <><LockOpen size={12} className="inline -mt-0.5 mr-1" strokeWidth={1.5} />No encryption support</>}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleMessage}
                className="w-full h-10 rounded-xl bg-cyan-primary text-text-on-cyan text-label font-medium hover:bg-cyan-hover transition-colors active:scale-[0.98]"
              >
                Message
              </button>

              {/* Pod context actions */}
              {podContext?.isCreatorOrMod && (
                <>
                  <button aria-label={`Promote ${firstName || 'user'} to moderator`} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-label text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors active:scale-[0.98]">
                    Promote to mod
                  </button>
                  <button aria-label={`Ban ${firstName || 'user'} from pod`} className="w-full h-10 rounded-xl bg-error/10 border border-error/20 text-label text-error hover:bg-error/20 transition-colors active:scale-[0.98]">
                    Ban
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
