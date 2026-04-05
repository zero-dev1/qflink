// src/components/messages/NewMessageModal.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { resolveQFName, isQFName, normalizeQFName } from '@/lib/qns';
import { isValidAddress } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { ConversationItem } from '@/stores/messages';

interface NewMessageModalProps {
  onClose: () => void;
  recentConversations: ConversationItem[];
}

export function NewMessageModal({ onClose, recentConversations }: NewMessageModalProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Debounced QNS resolution
  useEffect(() => {
    setResolvedAddress(null);
    setResolveError(null);

    const trimmed = input.trim();
    if (!trimmed) return;

    // Direct address input
    if (isValidAddress(trimmed)) {
      setResolvedAddress(trimmed.toLowerCase());
      return;
    }

    // QNS name lookup
    const qfName = normalizeQFName(trimmed);
    if (!qfName) return;

    setIsResolving(true);

    const timer = setTimeout(async () => {
      try {
        const addr = await resolveQFName(qfName);
        if (addr) {
          setResolvedAddress(addr.toLowerCase());
          setResolveError(null);
        } else {
          setResolvedAddress(null);
          setResolveError(`${qfName} not found`);
        }
      } catch {
        setResolveError('Failed to resolve name');
      } finally {
        setIsResolving(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [input]);

  const handleStart = useCallback(
    (address: string) => {
      onClose();
      navigate(`/dm/${address.toLowerCase()}`);
    },
    [onClose, navigate],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-overlay z-50"
      onClick={onClose}
    >
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-surface-4 border border-white/[0.06] rounded-t-xl md:rounded-xl z-50 w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 max-h-[85vh] overflow-y-auto md:max-w-modal fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/[0.10]" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2 font-display text-text-primary">New Message</h2>
            <Button variant="icon" onClick={onClose} aria-label="Close">
              ×
            </Button>
          </div>

          {/* Search input */}
          <input
            type="text"
            placeholder="Enter .qf name or address..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-body text-text-primary placeholder:text-text-tertiary outline-none focus:border-cyan-primary/30 transition-colors"
          />

          {/* Resolution feedback */}
          <div className="mt-3 min-h-[40px]">
            {isResolving && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
                <span className="text-body-sm text-text-tertiary">Resolving...</span>
              </div>
            )}

            {resolveError && (
              <p className="text-body-sm text-error">{resolveError}</p>
            )}

            <AnimatePresence mode="wait">
              {resolvedAddress && !isResolving && (
                <motion.div
                  key={resolvedAddress}
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => handleStart(resolvedAddress)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <Avatar address={resolvedAddress} size={32} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-label text-text-primary truncate">
                        {input.trim().endsWith('.qf') ? (
                          <>
                            {input.trim().slice(0, -3)}
                            <span className="text-cyan-primary">.qf</span>
                          </>
                        ) : (
                          `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}` 
                        )}
                      </p>
                      {input.trim().endsWith('.qf') && (
                        <p className="text-caption text-text-tertiary truncate">
                          {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                    <span className="text-caption text-cyan-primary">Message →</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent contacts */}
          {recentConversations.length > 0 && !input.trim() && (
            <div className="mt-4">
              <p className="text-caption text-text-tertiary mb-2">Recent</p>
              <div className="flex flex-col gap-1">
                {recentConversations.slice(0, 5).map((conv) => (
                  <button
                    key={conv.address}
                    onClick={() => handleStart(conv.address)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <Avatar address={conv.address} size={32} />
                    <p className="text-label text-text-primary truncate">
                      {conv.displayName && conv.displayName.endsWith('.qf') ? (
                        <>
                          {conv.displayName.slice(0, -3)}
                          <span className="text-cyan-primary">.qf</span>
                        </>
                      ) : (
                        conv.displayName ||
                        `${conv.address.slice(0, 6)}...${conv.address.slice(-4)}` 
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
