// src/components/pods/PodComposer.tsx
// Design System §15 — 6-beat pod creation with live preview, real contract integration
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useToastStore } from '@/stores/toast';
import {
  createPod,
  createPaidPod,
  getCreationFee,
} from '@/lib/contractCalls';
import { getContractErrorMessage } from '@/lib/contractErrors';
import { hapticTap, hapticSuccess, hapticError, chimeSuccess, chimeError } from '@/lib/feedback';
import { CATEGORIES, getCategoryColor } from '@/lib/categories';
import { formatExactAmount, cn } from '@/lib/utils';
import { Lock, Users } from 'lucide-react';

interface PodComposerProps {
  onClose: () => void;
  onSuccess: (podId?: number) => void;
}

export interface PodComposerData {
  name: string;
  category: string;
  isTokenGated: boolean;
  threshold: number;
  price: number;
  description: string;
}

type LaunchState = 'idle' | 'signing' | 'confirming' | 'success' | 'cancelled' | 'error';

export function PodComposer({ onClose, onSuccess }: PodComposerProps) {
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');

  // Contract state
  const [creationFee, setCreationFee] = useState<bigint | null>(null);
  const [launchState, setLaunchState] = useState<LaunchState>('idle');

  const { balance, isConnected } = useWalletStore();

  // Fetch creation fee when price changes (determines which contract to use)
  useEffect(() => {
    const contract = price > 0 ? 'createPaid' : 'create';
    getCreationFee(contract)
      .then(setCreationFee)
      .catch(() => setCreationFee(null));
  }, [price]);

  const canAffordFee = creationFee !== null && balance >= creationFee;

  // Progressive reveal: each beat is visible once prior beat has a value
  const showCategory = name.trim().length >= 3;
  const showAccess = showCategory && category.length > 0;
  const showPrice = showAccess;
  const showDescription = showPrice;
  const showLaunch = showDescription && name.trim().length > 0 && category.length > 0;

  // Fee display
  const feeDisplay = creationFee !== null ? formatExactAmount(creationFee) : '...';

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (!isConnected || !canAffordFee) return;
    hapticTap();

    setLaunchState('signing');

    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      const thresholdWei = isTokenGated && threshold > 0
        ? BigInt(Math.floor(threshold * 1e18))
        : 0n;
      const priceWei = price > 0
        ? BigInt(Math.floor(price * 1e18))
        : 0n;

      let result;
      if (priceWei > 0n) {
        result = await createPaidPod(
          trimmedName,
          true, // isPublic
          thresholdWei,
          priceWei,
          creationFee!, // creation fee (overridden inside the function)
          category,
          trimmedDesc
        );
      } else {
        result = await createPod(
          trimmedName,
          trimmedDesc,
          thresholdWei,
          0n,
          undefined,
          category
        );
      }

      setLaunchState('confirming');

      const confirmation = await result.confirmation;

      if (!confirmation.confirmed) {
        const errorMsg = confirmation.error || 'Transaction failed';
        // Check if user cancelled/rejected
        if (errorMsg.toLowerCase().includes('cancel') || errorMsg.toLowerCase().includes('reject') || errorMsg.toLowerCase().includes('denied')) {
          setLaunchState('cancelled');
          setTimeout(() => setLaunchState('idle'), 2000);
          return;
        }
        throw new Error(errorMsg);
      }

      // Success
      setLaunchState('success');
      hapticSuccess();
      chimeSuccess();
      useToastStore.getState().addToast('success', `${trimmedName} is live`);

      // Refresh pods list
      usePodsStore.getState().fetchPods();
      usePodsStore.getState().fetchUserPods();

      // Brief delay to show success state, then close
      setTimeout(() => {
        onSuccess();
      }, 800);

    } catch (error) {
      console.error('Pod creation failed:', error);
      const errorStr = String(error);

      // Check for user cancellation
      if (errorStr.toLowerCase().includes('cancel') || errorStr.toLowerCase().includes('reject') || errorStr.toLowerCase().includes('denied')) {
        setLaunchState('cancelled');
        setTimeout(() => setLaunchState('idle'), 2000);
        return;
      }

      setLaunchState('error');
      hapticError();
      chimeError();
      useToastStore.getState().addToast('error', getContractErrorMessage(error));
      setTimeout(() => setLaunchState('idle'), 3000);
    }
  }, [isConnected, canAffordFee, name, description, isTokenGated, threshold, price, creationFee, category, onSuccess]);

  // Launch button content
  let launchButtonContent: React.ReactNode;
  let launchButtonDisabled = false;

  switch (launchState) {
    case 'signing':
      launchButtonContent = 'Approve in wallet \u2192';
      launchButtonDisabled = true;
      break;
    case 'confirming':
      launchButtonContent = (
        <span className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-text-on-cyan rounded-full animate-spin" />
          Confirming...
        </span>
      );
      launchButtonDisabled = true;
      break;
    case 'success':
      launchButtonContent = (
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Pod created
        </span>
      );
      launchButtonDisabled = true;
      break;
    case 'cancelled':
      launchButtonContent = 'Cancelled \u2014 try again';
      launchButtonDisabled = false;
      break;
    case 'error':
      launchButtonContent = 'Failed \u2014 try again';
      launchButtonDisabled = false;
      break;
    default:
      if (!isConnected) {
        launchButtonContent = 'Connect wallet first';
        launchButtonDisabled = true;
      } else if (!canAffordFee) {
        launchButtonContent = 'Insufficient balance';
        launchButtonDisabled = true;
      } else {
        launchButtonContent = `Launch Pod \u00b7 ${feeDisplay} QF`;
        launchButtonDisabled = false;
      }
  }

  const catColor = category ? getCategoryColor(category) : '#00EFE7';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-surface-3 border border-white/[0.08] rounded-xl w-full max-w-[640px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left: Progressive reveal beats */}
          <div className="flex-1 p-6 space-y-5">
            {/* Beat 1 — Name */}
            <div>
              <p className="text-caption text-text-tertiary mb-2">Name your pod</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 32))}
                placeholder="Pod name..."
                autoFocus
                className="w-full bg-transparent outline-none font-display text-h2 text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Beat 2 — Category (reveals after 3+ chars) */}
            <AnimatePresence>
              {showCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-caption text-text-tertiary mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); hapticTap(); }}
                        className={cn(
                          'h-8 px-3 rounded-pill text-caption font-medium transition-all active:scale-[0.96]',
                          category === cat
                            ? 'text-white'
                            : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                        )}
                        style={category === cat ? { backgroundColor: getCategoryColor(cat) } : undefined}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beat 3 — Access (reveals after category) */}
            <AnimatePresence>
              {showAccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-caption text-text-tertiary mb-2">Who can join?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsTokenGated(false); hapticTap(); }}
                      className={cn(
                        'flex-1 h-10 rounded-xl text-label transition-all active:scale-[0.98]',
                        !isTokenGated ? 'bg-cyan-primary text-text-on-cyan' : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                      )}
                    >
                      Open to all
                    </button>
                    <button
                      onClick={() => { setIsTokenGated(true); hapticTap(); }}
                      className={cn(
                        'flex-1 h-10 rounded-xl text-label transition-all active:scale-[0.98]',
                        isTokenGated ? 'bg-cyan-primary text-text-on-cyan' : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                      )}
                    >
                      Token-gated
                    </button>
                  </div>
                  {isTokenGated && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                      <input
                        type="number"
                        value={threshold || ''}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        placeholder="Minimum QF balance..."
                        className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-body text-text-primary placeholder:text-text-tertiary outline-none"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beat 4 — Entry fee (reveals with access) */}
            <AnimatePresence>
              {showPrice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-caption text-text-tertiary mb-2">Entry fee (optional)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-body text-text-primary placeholder:text-text-tertiary outline-none"
                    />
                    <span className="text-label text-text-tertiary">QF</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beat 5 — Description (reveals with price) */}
            <AnimatePresence>
              {showDescription && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-caption text-text-tertiary mb-2">Description (optional)</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 256))}
                    placeholder="What's this pod about..."
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 outline-none text-body text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                  <p className="text-caption text-text-tertiary mt-1 text-right">{description.length}/256</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beat 6 — Launch button (reveals when form is ready) */}
            <AnimatePresence>
              {showLaunch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pt-2"
                >
                  {/* Balance warning */}
                  {isConnected && creationFee !== null && !canAffordFee && (
                    <p className="text-caption text-error mb-2">
                      Creation fee is {feeDisplay} QF — your balance is {formatExactAmount(balance)} QF
                    </p>
                  )}

                  <button
                    onClick={handleLaunch}
                    disabled={launchButtonDisabled}
                    className={cn(
                      'w-full h-12 rounded-xl text-label font-medium transition-all active:scale-[0.98]',
                      launchState === 'success'
                        ? 'bg-green-600 text-white'
                        : launchState === 'cancelled'
                          ? 'bg-white/[0.04] border border-white/[0.08] text-text-secondary'
                          : launchState === 'error'
                            ? 'bg-error/10 border border-error/20 text-error'
                            : launchButtonDisabled
                              ? 'bg-white/[0.04] text-text-tertiary cursor-not-allowed'
                              : 'bg-cyan-primary text-text-on-cyan hover:bg-cyan-hover'
                    )}
                  >
                    {launchButtonContent}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Live preview card */}
          <div className="w-full md:w-[220px] p-6 border-t md:border-t-0 md:border-l border-white/[0.06] flex items-center justify-center">
            <div className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              <div className="h-1" style={{ backgroundColor: catColor }} />
              <div className="p-3">
                {category && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium mb-1.5"
                    style={{ backgroundColor: `${catColor}15`, color: catColor }}
                  >
                    {category}
                  </span>
                )}
                <p className="text-label text-text-primary truncate">{name || 'Your pod'}</p>
                {description && (
                  <p className="text-caption text-text-secondary truncate mt-1">{description}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                    <Users size={10} /> 0
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {price > 0 ? `${price} QF` : 'Free'}
                    {isTokenGated && threshold > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-1">
                        <Lock size={8} /> {threshold}+ QF
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] active:scale-[0.96]"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}
