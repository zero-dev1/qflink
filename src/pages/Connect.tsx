// src/pages/Connect.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { cn } from '@/lib/utils';
import { hapticSuccess, hapticError, hapticTap } from '@/lib/feedback';

// ── Types ──────────────────────────────────────────────────────────

type ConnectState =
  | 'selection'       // State 0 — two wallet circles
  | 'selected'        // State 1 — one scales up, other fades
  | 'signing'         // State 2 — spinner arc, waiting for wallet
  | 'cancelled'       // State 3a — decel → X → restore
  | 'approved'        // State 3b — accel → checkmark
  | 'seal'            // State 4 — QFLink icon
  | 'qns'             // State 5 — emerald ring if .qf found
  | 'avatar'          // State 6 — avatar reveal
  | 'pill'            // State 7 — pill formation
  | 'entry';          // State 8 — animate to sidebar

type WalletId = 'talisman' | 'subwallet';

// ── Wallet config ──────────────────────────────────────────────────

const WALLETS: { id: WalletId; name: string; icon: JSX.Element }[] = [
  {
    id: 'talisman',
    name: 'Talisman',
    icon: (
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L12.5 7.5L18 10L12.5 12.5L10 18L7.5 12.5L2 10L7.5 7.5L10 2Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'subwallet',
    name: 'SubWallet',
    icon: (
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
    ),
  },
];

// ── Detect mobile ──────────────────────────────────────────────────

function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ── SVG Components ─────────────────────────────────────────────────

/** Spinning arc — the border IS the spinner */
function SpinnerArc({ state }: { state: 'spinning' | 'decel' | 'accel' }) {
  const cls = state === 'decel' ? 'spinner-arc-decel'
    : state === 'accel' ? 'spinner-arc-accel'
    : 'spinner-arc';

  return (
    <svg
      className="absolute inset-0"
      width="100%"
      height="100%"
      viewBox="0 0 96 96"
    >
      <circle
        className={cls}
        cx="48"
        cy="48"
        r="44"
      />
    </svg>
  );
}

/** X icon — morphed from arc endpoints */
function XMark() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.3 }}
    >
      <motion.line
        x1="8" y1="8" x2="20" y2="20"
        stroke="#F59E0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25 }}
      />
      <motion.line
        x1="20" y1="8" x2="8" y2="20"
        stroke="#F59E0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      />
    </motion.svg>
  );
}

/** Self-drawing checkmark */
function CheckMark() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.2 }}
    >
      <motion.path
        d="M6 14L11.5 19.5L22 8.5"
        stroke="#06B6D4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

/** QFLink seal mark */
function QFLinkMark() {
  return (
    <motion.div
      className="font-display font-semibold text-h3 text-text-primary select-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
    >
      QF
    </motion.div>
  );
}

/** Emerald ring trace animation */
function EmeraldRing({ size }: { size: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#06B6D4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        style={{
          animation: `ring-trace 0.6s ease-out forwards`,
          transformOrigin: 'center',
          transform: 'rotate(-90deg)',
        }}
      />
      {/* Pulse ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#06B6D4"
        strokeWidth="1"
        opacity="0"
        style={{
          animation: `pulse-ring 0.6s ease-out 0.5s forwards`,
        }}
      />
    </svg>
  );
}

/** Simple identicon-like avatar from address */
function AvatarIcon({ address }: { address: string }) {
  // Generate a deterministic color from the address
  const hash = address ? parseInt(address.slice(2, 10), 16) : 0;
  const hue = hash % 360;
  const bg = `hsl(${hue}, 40%, 25%)`;
  const letter = address ? address.slice(2, 3).toUpperCase() : '?';

  return (
    <div
      className="w-full h-full rounded-full flex items-center justify-center text-h2 font-display text-text-primary"
      style={{ background: bg }}
    >
      {letter}
    </div>
  );
}

// ── Letter stagger for welcome name ────────────────────────────────

function StaggerName({ text, suffix }: { text: string; suffix?: React.ReactNode }) {
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
      }}
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
      {suffix}
    </motion.span>
  );
}

// ── Wallet Circle ──────────────────────────────────────────────────

interface WalletCircleProps {
  wallet: typeof WALLETS[number];
  isSelected: boolean;
  isOther: boolean;
  connectState: ConnectState;
  onClick: () => void;
  evmAddress?: string;
  showQnsRing?: boolean;
}

function WalletCircle({ wallet, isSelected, isOther, connectState, onClick, evmAddress, showQnsRing }: WalletCircleProps) {
  const baseSize = 72;
  const expandedSize = 96;

  const isExpanded = isSelected && connectState !== 'selection';
  const currentSize = isExpanded ? expandedSize : baseSize;

  // Determine border color
  let borderColor = 'rgba(255,255,255,0.08)';
  if (connectState === 'cancelled' && isSelected) borderColor = '#F59E0B';
  if (connectState === 'approved' && isSelected) borderColor = '#06B6D4';

  // Determine inner content
  const renderInner = () => {
    if (!isSelected) {
      return <span className="text-text-secondary">{wallet.icon}</span>;
    }

    switch (connectState) {
      case 'signing':
        return <SpinnerArc state="spinning" />;
      case 'cancelled':
        return (
          <>
            <SpinnerArc state="decel" />
            <XMark />
          </>
        );
      case 'approved':
        return (
          <>
            <SpinnerArc state="accel" />
            <CheckMark />
          </>
        );
      case 'seal':
      case 'qns':
        return <QFLinkMark />;
      case 'avatar':
        return null;
      default:
        return <span className="text-text-secondary">{wallet.icon}</span>;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={connectState !== 'selection'}
      className="flex flex-col items-center gap-3 outline-none"
      animate={{
        opacity: isOther ? 0 : 1,
        scale: isOther ? 0.9 : 1,
        x: 0,
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ pointerEvents: isOther ? 'none' : 'auto' }}
    >
      <motion.div
        className="relative rounded-full flex items-center justify-center overflow-hidden"
        animate={{
          width: currentSize,
          height: currentSize,
          borderColor,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        style={{
          border: '2px solid',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={connectState}
            className="flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderInner()}
          </motion.div>
        </AnimatePresence>

        {/* §Fix1 — QNS emerald ring overlaid INSIDE the circle */}
        {connectState === 'qns' && showQnsRing && isSelected && (
          <EmeraldRing size={currentSize} />
        )}

        {/* §Fix1 — Avatar fades in as CHILD of circle container */}
        {isSelected && evmAddress && (connectState === 'avatar' || connectState === 'pill' || connectState === 'entry') && (
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <AvatarIcon address={evmAddress} />
          </motion.div>
        )}

        {/* Flash on approve */}
        {connectState === 'approved' && isSelected && (
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-primary/30"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          />
        )}
      </motion.div>

      {/* Label — only in selection state */}
      <AnimatePresence>
        {connectState === 'selection' && (
          <motion.span
            className="text-caption text-text-tertiary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {wallet.name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Main Connect Page ──────────────────────────────────────────────

export default function Connect() {
  const navigate = useNavigate();
  const isMobile = useIsMobileDevice();
  const {
    isConnected, isConnecting, qnsName, evmAddress, address,
    walletName: persistedWallet, walletError, connect, clearWalletError,
  } = useWalletStore();

  const [connectState, setConnectState] = useState<ConnectState>('selection');
  const [selectedWallet, setSelectedWallet] = useState<WalletId | null>(null);
  const [showQnsRing, setShowQnsRing] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const [showEntry, setShowEntry] = useState(false);

  const pillControls = useAnimationControls();

  // Display info
  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
      : '';
  const displaySuffix = qnsName ? <span className="text-cyan-primary">.qf</span> : null;
  const hasQns = !!qnsName;

  // Filter wallets by platform
  const visibleWallets = isMobile
    ? WALLETS.filter((w) => w.id === 'subwallet')
    : WALLETS;

  // ── Handle wallet selection ──────────────────────────────────────

  const handleSelectWallet = useCallback(async (walletId: WalletId) => {
    if (connectState !== 'selection') return;

    hapticTap();
    clearWalletError();
    setSelectedWallet(walletId);

    // State 1 — selection made
    setConnectState('selected');

    // Brief pause for the scale-up animation to play
    await new Promise((r) => setTimeout(r, 400));

    // State 2 — waiting for signature
    setConnectState('signing');

    // Actually connect
    await connect(walletId);

    const state = useWalletStore.getState();

    if (!state.isConnected) {
      // State 3a — cancelled or error
      setConnectState('cancelled');
      hapticError();

      // Hold X for 600ms then restore
      await new Promise((r) => setTimeout(r, 800));
      setConnectState('selection');
      setSelectedWallet(null);
      return;
    }

    // State 3b — approved!
    setConnectState('approved');
    hapticSuccess();

    await new Promise((r) => setTimeout(r, 600));

    // State 4 — QFLink seal
    setConnectState('seal');
    await new Promise((r) => setTimeout(r, 600));

    // State 5 — QNS acknowledgment
    setConnectState('qns');
    const latestState = useWalletStore.getState();
    if (latestState.qnsName) {
      setShowQnsRing(true);
    }
    await new Promise((r) => setTimeout(r, 700));

    // State 6 — Avatar reveal
    setConnectState('avatar');
    setShowAvatar(true);
    await new Promise((r) => setTimeout(r, 500));

    // State 7 — Pill formation
    setConnectState('pill');
    setShowPill(true);
    await new Promise((r) => setTimeout(r, 600));

    // State 8 — Entry
    setConnectState('entry');
    setShowEntry(true);

    // Animate pill to sidebar position then navigate
    await pillControls.start({
      x: isMobile ? 0 : -window.innerWidth / 2 + 40,
      y: isMobile ? window.innerHeight / 2 - 40 : window.innerHeight / 2 - 60,
      scale: 0.6,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 18,
      },
    });

    await new Promise((r) => setTimeout(r, 200));
    navigate('/home');
  }, [connectState, connect, clearWalletError, navigate, isMobile, pillControls]);

  // If already connected on mount, skip to home
  useEffect(() => {
    if (isConnected && connectState === 'selection') {
      navigate('/home', { replace: true });
    }
  }, []);

  // ── Status text under circle ─────────────────────────────────────

  const getStatusText = () => {
    switch (connectState) {
      case 'signing': return 'Approve in wallet...';
      case 'cancelled': return 'Cancelled';
      case 'approved': return 'Connected';
      case 'seal': return 'Setting up...';
      case 'qns': return hasQns ? `${displayName}.qf` : displayName;
      default: return null;
    }
  };

  const statusText = getStatusText();

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-hidden min-h-screen bg-base relative">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[25%] left-[20%] w-[400px] h-[350px] bg-cyan-primary/[0.04] blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] right-[15%] w-[350px] h-[300px] bg-cyan-primary/[0.03] blur-[130px] rounded-full" />
      </div>

      {/* ── Navbar — glass capsule, wordmark only (no Enter App button) §5.1 ── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-6 h-12 flex items-center justify-center"
        >
          <Link to="/" className="text-label font-display font-semibold select-none">
            QF<span className="text-cyan-primary">Link</span>
          </Link>
        </motion.div>
      </nav>

      {/* ── Main stage ── */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {/* ═══ States 0–5: Circle stage ═══ */}
          {!showPill && (
            <motion.div
              key="circle-stage"
              className="flex flex-col items-center"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
            >
              {/* Wallet circles */}
              <div className="flex items-center gap-8">
                {visibleWallets.map((w) => (
                  <WalletCircle
                    key={w.id}
                    wallet={w}
                    isSelected={selectedWallet === w.id}
                    isOther={selectedWallet !== null && selectedWallet !== w.id}
                    connectState={connectState}
                    onClick={() => handleSelectWallet(w.id)}
                    evmAddress={evmAddress || undefined}
                    showQnsRing={showQnsRing}
                  />
                ))}
              </div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                {statusText && (
                  <motion.p
                    key={statusText}
                    className={cn(
                      'mt-6 text-body-sm',
                      connectState === 'cancelled' ? 'text-warning' : 'text-text-secondary',
                      connectState === 'signing' && 'animate-pulse',
                    )}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {statusText}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Error from wallet store */}
              <AnimatePresence>
                {walletError && connectState === 'selection' && (
                  <motion.p
                    className="mt-4 text-body-sm text-error text-center max-w-xs"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {walletError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Mobile hint */}
              {isMobile && connectState === 'selection' && (
                <motion.p
                  className="mt-6 text-caption text-text-tertiary text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  On mobile? Open in SubWallet's browser
                </motion.p>
              )}

              {/* "Choose your wallet" — only in selection */}
              {connectState === 'selection' && !walletError && (
                <motion.p
                  className="mt-8 text-body-sm text-text-tertiary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Choose your wallet to continue
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ═══ States 7–8: Pill formation + entry ═══ */}
          {showPill && (
            <motion.div
              key="pill-stage"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.div
                layoutId="profile-capsule"
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-full border-2',
                  hasQns ? 'border-[#06B6D4]' : 'border-white/[0.10]',
                )}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                }}
                animate={pillControls}
                layout
              >
                {/* Avatar */}
                <motion.div
                  className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {evmAddress && <AvatarIcon address={evmAddress} />}
                </motion.div>

                {/* Name */}
                <motion.div
                  className="font-display text-label text-text-primary whitespace-nowrap"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  <StaggerName text={displayName} suffix={displaySuffix} />
                </motion.div>

                {/* Balance placeholder */}
                <motion.span
                  className="text-caption text-text-tertiary ml-2 whitespace-nowrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  QF
                </motion.span>
              </motion.div>

              {/* "Enter QFLink" below pill — or auto-transition */}
              {showEntry && (
                <motion.p
                  className="mt-8 text-body-sm text-text-tertiary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0.5] }}
                  transition={{ duration: 1.2 }}
                >
                  Entering QFLink...
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
