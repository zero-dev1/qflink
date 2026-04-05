// src/pages/Connect.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { hapticSuccess, chimeSuccess } from '@/lib/feedback';

// ── Wallet options ──────────────────────────────────────────────────
const WALLETS = [
  { id: 'talisman' as const, name: 'Talisman', desc: 'Browser extension for Substrate & EVM' },
  { id: 'subwallet' as const, name: 'SubWallet', desc: 'Mobile and browser extension' },
] as const;

type WalletId = (typeof WALLETS)[number]['id'];

// ── Checkmark SVG with draw animation ───────────────────────────────
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-cyan-primary">
      <path
        d="M4 10.5L8 14.5L16 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="24"
        className="animate-check-draw"
      />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function Connect() {
  const navigate = useNavigate();
  const {
    isConnected,
    isConnecting,
    qnsName,
    evmAddress,
    address,
    walletName: persistedWallet,
    walletError,
    connect,
    clearWalletError,
  } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);

  const [connectingId, setConnectingId] = useState<WalletId | null>(null);
  const [showPostConnect, setShowPostConnect] = useState(false);

  // Detect returning user (has persisted wallet but not yet connected — rehydrating)
  const isReturning = !isConnected && !isConnecting && !!address && !!persistedWallet;

  // Display name
  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
      : '';

  const displaySuffix = qnsName ? (
    <span className="text-cyan-primary">.qf</span>
  ) : null;

  // Handle connect
  const handleConnect = async (walletType: WalletId) => {
    clearWalletError();
    setConnectingId(walletType);
    await connect(walletType);

    const state = useWalletStore.getState();
    if (state.isConnected) {
      addToast('success', 'Connected successfully');
      
      // Haptic and sound feedback
      hapticSuccess();
      chimeSuccess();
      
      // Brief pause to let the connected state render before crossfading
      setTimeout(() => setShowPostConnect(true), 600);
    }
    setConnectingId(null);
  };

  // If already connected on mount (e.g., navigated here while connected), show post-connect immediately
  useEffect(() => {
    if (isConnected) {
      setShowPostConnect(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Minimal nav — just logo */}
      <header className="flex items-center px-4 md:px-12 h-16">
        <Link to="/" className="text-h2 font-display text-text-primary">
          QF<span className="text-cyan-primary">Link</span>
        </Link>
      </header>

      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 pb-16">
        <div className="w-full max-w-connect mx-auto md:px-0">

          {/* ─── Heading with crossfade ────────────────────────── */}
          <AnimatePresence mode="wait">
            {showPostConnect ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <h1 className="font-display text-h1 md:text-display text-text-primary text-center">
                  Welcome, {displayName}{displaySuffix}
                </h1>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-8"
                >
                  <Button onClick={() => navigate('/home')}>
                    Enter QFLink
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="connect"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <h1 className="font-display text-h1 md:text-display text-text-primary text-center">
                  {isReturning ? 'Welcome back' : 'Connect to QFLink'}
                </h1>
                {isReturning && qnsName && (
                  <p className="mt-1 text-body text-text-secondary">
                    {qnsName.replace('.qf', '')}
                    <span className="text-cyan-primary">.qf</span>
                  </p>
                )}
                {!isReturning && (
                  <p className="mt-2 text-body-sm text-text-secondary">
                    Choose your wallet to continue
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Wallet Cards ─────────────────────────────────── */}
          {!showPostConnect && (
            <div className="mt-8 flex flex-col gap-3">
              <AnimatePresence>
                {/* Returning user: single reconnect card */}
                {isReturning ? (
                  <motion.div
                    key="reconnect"
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => handleConnect(persistedWallet as WalletId)}
                      disabled={isConnecting}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 md:p-5 rounded-lg bg-surface-2 border border-border-subtle',
                        'transition-all duration-200',
                        'hover:border-cyan-border',
                        'disabled:opacity-50 disabled:pointer-events-none'
                      )}
                    >
                      <div className="h-10 w-10 rounded-sm bg-surface-3 flex items-center justify-center text-text-secondary text-h3 font-sans font-semibold">
                        {(persistedWallet || 'W')[0].toUpperCase()}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-h3 font-sans font-semibold text-text-primary capitalize">
                          {persistedWallet}
                        </p>
                        <p className="text-body-sm text-text-secondary">Reconnect to continue</p>
                      </div>
                      {isConnecting && (
                        <div className="h-5 w-5 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        // Clear persisted state to show full wallet list
                        useWalletStore.getState().disconnect();
                      }}
                      className="mt-3 w-full text-center text-body-sm text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Use a different wallet
                    </button>
                  </motion.div>
                ) : (
                  /* Full wallet list */
                  WALLETS.map((w) => {
                    const isSelected = connectingId === w.id;
                    const isOther = connectingId !== null && connectingId !== w.id;
                    const isJustConnected = isConnected && connectingId === null;

                    return (
                      <motion.div
                        key={w.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{
                          opacity: isOther ? 0.5 : 1,
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.button
                          onClick={() => !isConnecting && handleConnect(w.id)}
                          disabled={isConnecting}
                          whileHover={!isConnecting ? { y: -2 } : undefined}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'relative w-full flex items-center gap-4 p-4 md:p-5 rounded-lg border transition-colors duration-200',
                            isSelected && isConnecting
                              ? 'bg-surface-2 animate-border-pulse'
                              : isSelected && isConnected
                                ? 'bg-cyan-muted border-cyan-border'
                                : 'bg-surface-2 border-border-subtle hover:border-cyan-border',
                            isOther && 'pointer-events-none',
                          )}
                        >
                          {/* Icon area */}
                          <div className={cn(
                            'h-10 w-10 rounded-sm flex items-center justify-center transition-colors duration-200',
                            isSelected && isConnected
                              ? 'bg-transparent'
                              : 'bg-surface-3'
                          )}>
                            {isSelected && isConnected ? (
                              <CheckIcon />
                            ) : (
                              <span className="text-text-secondary text-h3 font-sans font-semibold">
                                {w.name[0]}
                              </span>
                            )}
                          </div>

                          {/* Text */}
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-h3 font-sans font-semibold text-text-primary">
                              {isSelected && isConnected ? (
                                <>
                                  {displayName}{displaySuffix}
                                </>
                              ) : (
                                w.name
                              )}
                            </p>
                            <p className="text-body-sm text-text-secondary">
                              {isSelected && isConnected ? 'Connected' : w.desc}
                            </p>
                          </div>

                          {/* Spinner during connecting */}
                          {isSelected && isConnecting && (
                            <div className="h-5 w-5 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin shrink-0" />
                          )}

                          {/* Shimmer overlay during connecting */}
                          {isSelected && isConnecting && (
                            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                              <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-cyan-muted to-transparent bg-[length:200%_100%]" />
                            </div>
                          )}
                        </motion.button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ─── Error ────────────────────────────────────────── */}
          <AnimatePresence>
            {walletError && !showPostConnect && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-body-sm text-error text-center"
              >
                {walletError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
