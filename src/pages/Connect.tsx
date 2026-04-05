// src/pages/Connect.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { hapticSuccess, chimeSuccess } from '@/lib/feedback';

// ── Wallet config ───────────────────────────────────────────────────
const WALLETS = [
  {
    id: 'talisman' as const,
    name: 'Talisman',
    desc: 'Browser extension for Substrate & EVM',
    // Abstracted star/compass icon
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L12.5 7.5L18 10L12.5 12.5L10 18L7.5 12.5L2 10L7.5 7.5L10 2Z" 
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'subwallet' as const,
    name: 'SubWallet',
    desc: 'Mobile and browser extension',
    // Abstracted layers icon
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
    ),
    mobileOnly: true,
  },
  // TODO: Add MetaMask support later
  // {
  //   id: 'metamask' as const,
  //   name: 'MetaMask',
  //   desc: 'Browser extension for EVM',
  //   // Abstracted diamond/hexagon
  //   icon: (
  //     <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
  //       <path d="M10 2L17 7V13L10 18L3 13V7L10 2Z" 
  //         stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  //     </svg>
  //   ),
  //   desktopOnly: true,
  // },
] as const;

type WalletId = (typeof WALLETS)[number]['id'];

// ── Detect mobile ───────────────────────────────────────────────────
function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Checkmark with draw animation ───────────────────────────────────
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-cyan-primary">
      <path d="M4 10.5L8 14.5L16 6.5" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24"
        className="animate-check-draw" />
    </svg>
  );
}

// ── Letter-stagger for the welcome name ─────────────────────────────
function StaggerName({ text, suffix }: { text: string; suffix?: React.ReactNode }) {
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1, y: 0,
              transition: { type: 'spring', damping: 14, stiffness: 200 },
            },
          }}
        >
          {char}
        </motion.span>
      ))}
      {suffix && (
        <motion.span
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1, y: 0,
              transition: { type: 'spring', damping: 14, stiffness: 200, delay: text.length * 0.04 + 0.2 },
            },
          }}
        >
          {suffix}
        </motion.span>
      )}
    </motion.span>
  );
}

// ── Main Connect Page ───────────────────────────────────────────────
export default function Connect() {
  const navigate = useNavigate();
  const isMobile = useIsMobileDevice();
  const {
    isConnected, isConnecting, qnsName, evmAddress, address,
    walletName: persistedWallet, walletError, connect, clearWalletError,
  } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);

  const [connectingId, setConnectingId] = useState<WalletId | null>(null);
  const [showPostConnect, setShowPostConnect] = useState(false);

  const isReturning = !isConnected && !isConnecting && !!address && !!persistedWallet;

  // Display name
  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
      : '';

  const displaySuffix = qnsName ? <span className="text-cyan-primary">.qf</span> : null;

  // Filter wallets by platform
  const visibleWallets = WALLETS.filter((w) => {
    if ('mobileOnly' in w && w.mobileOnly && !isMobile) return false;
    if ('desktopOnly' in w && w.desktopOnly && isMobile) return false;
    return true;
  });

  // Handle connect
  const handleConnect = async (walletType: WalletId) => {
    clearWalletError();
    setConnectingId(walletType);
    await connect(walletType);

    const state = useWalletStore.getState();
    if (state.isConnected) {
      addToast('success', 'Connected successfully');
      hapticSuccess();
      chimeSuccess();
      setTimeout(() => setShowPostConnect(true), 600);
    }
    setConnectingId(null);
  };

  // If already connected on mount
  useEffect(() => {
    if (isConnected) setShowPostConnect(true);
  }, []);

  return (
    <div className="h-full overflow-y-auto min-h-screen bg-base relative">
      {/* ── Ambient gradient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[25%] left-[20%] w-[400px] h-[350px] bg-cyan-primary/[0.04] blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] right-[15%] w-[350px] h-[300px] bg-cyan-primary/[0.03] blur-[130px] rounded-full" />
      </div>

      {/* ── Content ── */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[400px] mx-auto">

          {/* ── Wordmark ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <Link to="/" className="text-h1 font-display font-semibold">
              QF<span className="text-cyan-primary">Link</span>
            </Link>
          </motion.div>

          {/* ── Main content with crossfade ── */}
          <AnimatePresence mode="wait">
            {showPostConnect ? (
              /* ════════════════════════════════════════════════════
                 POST-CONNECT: Welcome ceremony
                 ════════════════════════════════════════════════════ */
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                {/* Welcome label */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-body text-text-secondary mb-3"
                >
                  Welcome,
                </motion.p>

                {/* Name — large, letter-stagger entrance */}
                <h1 className="font-display text-display md:text-[48px] text-text-primary leading-tight">
                  <StaggerName text={displayName} suffix={displaySuffix} />
                </h1>

                {/* QNS nudge if no .qf name */}
                {!qnsName && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.3 }}
                    className="mt-3"
                  >
                    <a
                      href="https://dotqf.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-sm text-text-tertiary hover:text-cyan-primary transition-colors"
                    >
                      Claim your .qf name →
                    </a>
                  </motion.div>
                )}

                {/* Enter button with shimmer */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qnsName ? 0.8 : 1.0, duration: 0.4 }}
                  className="mt-10"
                >
                  <button
                    onClick={() => navigate('/home')}
                    className="relative h-12 px-10 rounded-full bg-cyan-primary text-on-cyan text-body font-medium hover:bg-cyan-hover active:bg-cyan-pressed transition-colors overflow-hidden"
                  >
                    Enter QFLink
                    {/* Single shimmer sweep */}
                    <motion.span
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ delay: qnsName ? 1.2 : 1.4, duration: 0.8, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              /* ════════════════════════════════════════════════════
                 PRE-CONNECT: Wallet selection
                 ════════════════════════════════════════════════════ */
              <motion.div
                key="connect"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Heading */}
                <div className="text-center mb-8">
                  <h1 className="font-display text-h1 text-text-primary">
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
                </div>

                {/* Wallet cards */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {isReturning ? (
                      /* Returning user: single reconnect card */
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
                            'w-full flex items-center gap-4 p-5 rounded-xl',
                            'bg-white/[0.03] backdrop-blur-md border border-white/[0.06]',
                            'transition-all duration-200',
                            'hover:border-cyan-primary/20',
                            'disabled:opacity-50 disabled:pointer-events-none',
                          )}
                        >
                          <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary">
                            {visibleWallets.find(w => w.id === persistedWallet)?.icon || (
                              <span className="text-h3 font-semibold">{(persistedWallet || 'W')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-label text-text-primary capitalize">{persistedWallet}</p>
                            <p className="text-body-sm text-text-secondary">Reconnect to continue</p>
                          </div>
                          {isConnecting && (
                            <div className="h-5 w-5 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin" />
                          )}
                        </button>

                        <button
                          onClick={() => useWalletStore.getState().disconnect()}
                          className="mt-3 w-full text-center text-body-sm text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          Use a different wallet
                        </button>
                      </motion.div>
                    ) : (
                      /* Full wallet list */
                      visibleWallets.map((w, index) => {
                        const isSelected = connectingId === w.id;
                        const isOther = connectingId !== null && connectingId !== w.id;

                        return (
                          <motion.div
                            key={w.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{
                              opacity: isOther ? 0.3 : 1,
                              y: 0,
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            <motion.button
                              onClick={() => !isConnecting && handleConnect(w.id)}
                              disabled={isConnecting}
                              whileHover={!isConnecting ? { y: -2 } : undefined}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                'relative w-full flex items-center gap-4 p-5 rounded-xl border overflow-hidden',
                                'transition-colors duration-200',
                                isSelected && isConnecting
                                  ? 'bg-white/[0.03] backdrop-blur-md animate-border-pulse'
                                  : isSelected && isConnected
                                    ? 'bg-cyan-muted border-cyan-primary/30'
                                    : 'bg-white/[0.03] backdrop-blur-md border-white/[0.06] hover:border-cyan-primary/20',
                                isOther && 'pointer-events-none',
                              )}
                            >
                              {/* Top edge highlight — glass refraction detail */}
                              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                              {/* Icon */}
                              <div className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-200',
                                isSelected && isConnected
                                  ? 'bg-transparent'
                                  : 'bg-white/[0.04] border border-white/[0.06]',
                              )}>
                                {isSelected && isConnected ? (
                                  <CheckIcon />
                                ) : (
                                  <span className="text-text-secondary">{w.icon}</span>
                                )}
                              </div>

                              {/* Text */}
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-label text-text-primary">
                                  {isSelected && isConnected ? (
                                    <>{displayName}{displaySuffix}</>
                                  ) : (
                                    w.name
                                  )}
                                </p>
                                <p className="text-body-sm text-text-secondary">
                                  {isSelected && isConnected ? 'Connected' : w.desc}
                                </p>
                              </div>

                              {/* Spinner */}
                              {isSelected && isConnecting && (
                                <div className="h-5 w-5 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin shrink-0" />
                              )}

                              {/* Shimmer overlay during connecting */}
                              {isSelected && isConnecting && (
                                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                  <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-cyan-primary/[0.06] to-transparent bg-[length:200%_100%]" />
                                </div>
                              )}
                            </motion.button>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>

                {/* Need a wallet? */}
                {!isReturning && !isConnecting && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 text-center text-caption text-text-tertiary"
                  >
                    Need a wallet?{' '}
                    <a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer"
                      className="text-text-secondary hover:text-cyan-primary transition-colors">
                      Talisman
                    </a>
                    {' · '}
                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                      className="text-text-secondary hover:text-cyan-primary transition-colors">
                      MetaMask
                    </a>
                  </motion.p>
                )}

                {/* Error */}
                <AnimatePresence>
                  {walletError && (
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
