// src/pages/Landing.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { NavCapsule } from '@/components/landing/NavCapsule';
import { getMessageCount, getUserCount, getPodCount } from '@/lib/contractCalls';

// ── Animation helpers ──────────────────────────────────────────────

/** Staggered line-by-line reveal for hero headline */
function HeroLines({ lines }: { lines: string[] }) {
  return (
    <div className="flex flex-col items-center">
      {lines.map((line, i) => (
        <motion.span
          key={i}
          className="block font-display font-bold text-[clamp(36px,7vw,64px)] leading-[1.08] text-text-primary"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3 + i * 0.2,
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {line}
        </motion.span>
      ))}
    </div>
  );
}

/** Counter that animates from 0 to target */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || target === 0) return;
    const dur = 1200;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
      else setCount(target);
    }
    requestAnimationFrame(tick);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/** Scroll-down chevron indicator */
function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(false);
    window.addEventListener('scroll', onScroll, { once: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.0 }}
    >
      <motion.svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-text-tertiary"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </motion.div>
  );
}

// ── Section 2 — Split Reveal ──────────────────────────────────────

function SplitSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="snap-section flex flex-col md:flex-row">
      {/* Left/Top — Cyan. Desktop: slides up. Mobile: slides from left (§4.4) */}
      <motion.div
        className="flex-1 bg-cyan-primary flex items-center justify-center p-8 md:p-16"
        initial={{ x: '-100%', y: 0 }}
        animate={inView ? { x: 0, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ willChange: 'transform' }}
      >
        <div className="text-center md:text-left max-w-sm">
          <h2 className="font-display font-bold text-[clamp(32px,5vw,52px)] leading-[1.1] text-[#050505]">
            Your pod.
            <br />
            Your rules.
          </h2>
        </div>
      </motion.div>

      {/* Right/Bottom — Black. Desktop: slides down. Mobile: slides from right (§4.4) */}
      <motion.div
        className="flex-1 bg-base flex items-center justify-center p-8 md:p-16"
        initial={{ x: '100%', y: 0 }}
        animate={inView ? { x: 0, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ willChange: 'transform' }}
      >
        <p className="text-body md:text-[17px] text-text-secondary leading-relaxed max-w-sm text-center md:text-left">
          Token-gated group chats where your QF balance determines access.
          Every message is an on-chain transaction. Nothing deleted, nothing
          censored, nothing lost.
        </p>
      </motion.div>
    </section>
  );
}

// ── Section 3 — Self-Drawing Lock ─────────────────────────────────

function LockSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [lockDone, setLockDone] = useState(false);

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => setLockDone(true), 900);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  // Lock SVG path — shackle + body
  const shacklePath = 'M32 44V28C32 19.16 39.16 12 48 12C56.84 12 64 19.16 64 28V44';
  const bodyPath = 'M28 44H68C70.2 44 72 45.8 72 48V72C72 74.2 70.2 76 68 76H28C25.8 76 24 74.2 24 72V48C24 45.8 25.8 44 28 44Z';
  const keyholeCircle = 'M48 56C50.2 56 52 57.8 52 60C52 61.6 51.1 63 49.8 63.7L51 70H45L46.2 63.7C44.9 63 44 61.6 44 60C44 57.8 45.8 56 48 56Z';

  return (
    <section ref={ref} className="snap-section bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-6">
        {/* Animated lock icon */}
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="text-cyan-primary">
          {/* Shackle */}
          <motion.path
            d={shacklePath}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          {/* Body */}
          <motion.path
            d={bodyPath}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          />
          {/* Keyhole */}
          <motion.path
            d={keyholeCircle}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.6, ease: 'easeOut' }}
          />
        </svg>

        {/* Text — staggered entrance after lock completes */}
        {/* §4.5 — Three lines, staggered entrance 100ms apart, same weight */}
        <div className="flex flex-col items-center gap-3 text-center">
          {[
            'Wallet-to-wallet.',
            'No phone number. No server.',
            'Your keys, your conversations.',
          ].map((line, i) => (
            <motion.p
              key={i}
              className="font-display text-h2 md:text-h1 text-text-primary"
              initial={{ opacity: 0, y: 12 }}
              animate={lockDone ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section 4 — Hex → .qf Name Morph ──────────────────────────────

const HEX_ADDRESS = '0x5b34...9cc7';
const QF_NAME = 'alice.qf';

function NameMorphSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [phase, setPhase] = useState<'idle' | 'typing' | 'pause' | 'morphing' | 'done'>('idle');
  const [typed, setTyped] = useState('');
  const [morphIndex, setMorphIndex] = useState(0);
  const [tagline, setTagline] = useState(false);

  useEffect(() => {
    if (!inView) return;
    setPhase('typing');
  }, [inView]);

  // Phase: typing hex address
  useEffect(() => {
    if (phase !== 'typing') return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(HEX_ADDRESS.slice(0, i));
      if (i >= HEX_ADDRESS.length) {
        clearInterval(interval);
        setPhase('pause');
      }
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  // Phase: pause then morph
  useEffect(() => {
    if (phase !== 'pause') return;
    const timer = setTimeout(() => setPhase('morphing'), 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase: slot-machine morph characters
  useEffect(() => {
    if (phase !== 'morphing') return;
    let i = 0;
    const maxLen = Math.max(HEX_ADDRESS.length, QF_NAME.length);
    const interval = setInterval(() => {
      i++;
      setMorphIndex(i);
      if (i >= maxLen) {
        clearInterval(interval);
        setPhase('done');
        setTimeout(() => setTagline(true), 300);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  // Build the display string
  const getDisplay = useCallback(() => {
    if (phase === 'idle') return '';
    if (phase === 'typing' || phase === 'pause') return typed;

    // Morphing: replace characters left-to-right
    const result: { char: string; isCyan: boolean }[] = [];
    const maxLen = Math.max(HEX_ADDRESS.length, QF_NAME.length);

    for (let c = 0; c < maxLen; c++) {
      if (c < morphIndex) {
        // Already morphed — show QF_NAME char
        if (c < QF_NAME.length) {
          const isSuffix = c >= QF_NAME.length - 3; // ".qf"
          result.push({ char: QF_NAME[c], isCyan: isSuffix });
        }
        // If HEX was longer, these chars just disappear
      } else {
        // Not yet morphed — show HEX char
        if (c < HEX_ADDRESS.length) {
          result.push({ char: HEX_ADDRESS[c], isCyan: false });
        }
      }
    }
    return result;
  }, [phase, typed, morphIndex]);

  const display = getDisplay();

  return (
    <section ref={ref} className="snap-section bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 px-6">
        {/* Address / name display */}
        <div className="font-display font-bold text-[clamp(28px,5vw,48px)] leading-[1.1] text-text-primary min-h-[1.2em]">
          {typeof display === 'string' ? (
            <span className={phase === 'typing' ? 'typing-cursor' : ''}>
              {display}
            </span>
          ) : (
            <span>
              {display.map((d, i) => (
                <motion.span
                  key={i}
                  className={d.isCyan ? 'text-cyan-primary' : ''}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  {d.char}
                </motion.span>
              ))}
            </span>
          )}
        </div>

        {/* Tagline */}
        <motion.p
          className="text-body md:text-[17px] text-text-secondary"
          initial={{ opacity: 0, y: 8 }}
          animate={tagline ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          Become someone on-chain.
        </motion.p>
      </div>
    </section>
  );
}

// ── Section 5 — Final CTA + Footer ────────────────────────────────

function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const { isConnected } = useWalletStore();
  const ctaPath = isConnected ? '/home' : '/connect';

  return (
    <section
      ref={ref}
      className="snap-section flex flex-col items-center justify-center relative"
      style={{
        background: 'linear-gradient(180deg, #050505 0%, #0d0a08 60%, #0f0b09 100%)',
      }}
    >
      {/* Main CTA content */}
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <motion.h2
          className="font-display font-bold text-[clamp(32px,6vw,56px)] leading-[1.1] text-text-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          The chain is waiting.
        </motion.h2>

        <motion.p
          className="text-body text-text-secondary max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          No sign-up. No email. Just your wallet.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Link
            to={ctaPath}
            className="inline-flex items-center justify-center h-12 px-10 rounded-full bg-cyan-primary text-text-on-cyan text-body font-medium hover:bg-cyan-hover active:bg-cyan-pressed transition-colors"
          >
            Enter QFLink
          </Link>
        </motion.div>

        {/* External links */}
        <motion.div
          className="flex items-center gap-6 mt-4"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <a
            href="https://qfnetwork.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label text-text-tertiary hover:text-text-secondary transition-colors"
          >
            QF Network &#8599;
          </a>
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label text-text-tertiary hover:text-text-secondary transition-colors"
          >
            dotqf.xyz &#8599;
          </a>
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] h-20 px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          {/* Left — wordmark */}
          <span className="text-caption font-display font-semibold text-text-tertiary">
            QF<span className="text-cyan-primary/60">Link</span>
          </span>

          {/* Center — motto */}
          <span className="text-caption text-text-tertiary tracking-wide hidden sm:block">
            Sovereign. On-Chain. Yours.
          </span>

          {/* Right — links */}
          <div className="flex items-center gap-4">
            <a
              href="https://qfnetwork.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-text-tertiary hover:text-text-secondary transition-colors"
            >
              QF Network
            </a>
            <a
              href="https://dotqf.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-text-tertiary hover:text-text-secondary transition-colors"
            >
              dotqf.xyz
            </a>
          </div>
        </div>
        <p className="text-center text-[10px] text-text-tertiary/50 -mt-3 pb-2">
          Built on QF Network
        </p>
      </footer>
    </section>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────

export default function Landing() {
  const { isConnected } = useWalletStore();
  const [stats, setStats] = useState({ messages: 0, pods: 0, users: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctaPath = isConnected ? '/home' : '/connect';

  useEffect(() => {
    Promise.all([
      getMessageCount().catch(() => 0n),
      getPodCount().catch(() => 0n),
      getUserCount().catch(() => 0n),
    ]).then(([m, p, u]) =>
      setStats({ messages: Number(m), pods: Number(p), users: Number(u) }),
    );
  }, []);

  return (
    <div className="h-screen bg-base overflow-hidden">
      {/* Floating nav capsule */}
      <NavCapsule scrollRef={scrollRef as React.RefObject<HTMLElement>} />

      {/* Snap scroll container */}
      <div ref={scrollRef} className="snap-container">
        {/* ═══ Section 1 — THE CLAIM (Hero) ═══ */}
        <section className="snap-section bg-base flex flex-col items-center justify-center text-center relative">
          {/* Breathing radial gradient */}
          <div className="absolute inset-0 breathing-bg pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-0 px-6">
            <HeroLines lines={['Every message,', 'on-chain,', 'forever.']} />

            {/* CTA — cyan text link, not a button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="mt-8"
            >
              <Link
                to={ctaPath}
                className="text-body text-cyan-primary hover:text-cyan-hover transition-colors"
              >
                Enter App &rarr;
              </Link>
            </motion.div>
          </div>

          {/* Network Pulse stats — bottom of viewport */}
          <motion.div
            className="absolute bottom-16 left-0 right-0 flex items-center justify-center gap-6 text-caption text-text-tertiary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
          >
            {stats.users > 0 && (
              <span>
                <Counter target={stats.users} /> members
              </span>
            )}
            {stats.pods > 0 && (
              <span>
                <Counter target={stats.pods} /> pods
              </span>
            )}
            {stats.messages > 0 && (
              <span>
                <Counter target={stats.messages} /> messages
              </span>
            )}
          </motion.div>

          {/* Scroll indicator */}
          <ScrollIndicator />
        </section>

        {/* ═══ Section 2 — THE SPLIT (Pods) ═══ */}
        <SplitSection />

        {/* ═══ Section 3 — THE LOCK (Encrypted DMs) ═══ */}
        <LockSection />

        {/* ═══ Section 4 — THE NAME (QNS Identity) ═══ */}
        <NameMorphSection />

        {/* ═══ Section 5 — THE CALL (Final CTA) ═══ */}
        <CTASection />
      </div>
    </div>
  );
}
