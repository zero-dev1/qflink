// src/pages/Landing.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useSpotlightStore } from '@/stores/spotlight';
import { PodCard } from '@/components/pods/PodCard';
import { Button } from '@/components/ui/Button';
import { ChainPulse } from '@/components/landing/ChainPulse';
import { getAllPods, getMessageCount, getUserCount, getPodCount } from '@/lib/contractCalls';
import type { PodData } from '@/lib/contractCalls';

// ── Animation helpers ──────────────────────────────────────────────

function StaggerText({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <motion.span
      aria-label={text}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.025, delayChildren: 0.1 } } }}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((char, ci) => (
            <motion.span
              key={`${wi}-${ci}`}
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: {
                  opacity: 1, y: 0,
                  transition: { type: 'spring', damping: 14, stiffness: 200 },
                },
              }}
            >
              {char}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
}

function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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

// ── Fake chat messages for product preview ─────────────────────────

const demoMessages = [
  { sender: 'alice', name: 'alice.qf', text: 'just bridged 50k QF', side: 'left' as const, delay: 0.6 },
  { sender: 'bob', name: 'bob.qf', text: 'welcome to the pod', side: 'left' as const, delay: 1.4 },
  { sender: 'you', name: 'you', text: 'good to be here', side: 'right' as const, delay: 2.4 },
  { sender: 'alice', name: 'alice.qf', text: 'check the alpha channel 👀', side: 'left' as const, delay: 3.2 },
];

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = demoMessages.map((msg, i) =>
      setTimeout(() => setVisibleCount(i + 1), msg.delay * 1000)
    );
    // Loop
    const reset = setTimeout(() => setVisibleCount(0), 6000);
    const restart = setTimeout(() => {
      const timers2 = demoMessages.map((msg, i) =>
        setTimeout(() => setVisibleCount(i + 1), msg.delay * 1000)
      );
      return () => timers2.forEach(clearTimeout);
    }, 6500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(reset);
      clearTimeout(restart);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glass container */}
      <div className="bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-primary" />
            <span className="text-body-sm text-text-primary font-medium">QF Network</span>
          </div>
          <span className="text-caption text-text-tertiary">12 members</span>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-3 min-h-[180px]">
          <AnimatePresence>
            {demoMessages.slice(0, visibleCount).map((msg, i) => (
              <motion.div
                key={`${msg.sender}-${i}`}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`flex ${msg.side === 'right' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${msg.side === 'right' ? '' : ''}`}>
                  {msg.side === 'left' && (
                    <p className="text-[11px] text-text-tertiary mb-0.5">
                      {msg.name.replace('.qf', '')}<span className="text-cyan-primary">.qf</span>
                    </p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-lg text-body-sm ${
                      msg.side === 'right'
                        ? 'bg-cyan-muted text-text-primary'
                        : 'text-text-primary'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
            <span className="text-body-sm text-text-tertiary">Message QF Network...</span>
          </div>
        </div>
      </div>

      {/* Subtle glow behind preview */}
      <div className="absolute -inset-8 -z-10 bg-cyan-primary/[0.03] blur-3xl rounded-full" />
    </div>
  );
}

// ── Feature card SVG icons ─────────────────────────────────────────

function PodIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.8" />
      <rect x="5" y="11" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="7" y="17" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function DMIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="11" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M14 10H18M14 14H17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { isConnected, qnsName } = useWalletStore();
  const [pods, setPods] = useState<PodData[]>([]);
  const [stats, setStats] = useState({ messages: 0, pods: 0, users: 0 });

  useEffect(() => {
    getAllPods().then((p) => setPods(p.slice(0, 3))).catch(() => {});
    Promise.all([
      getMessageCount().catch(() => 0n),
      getPodCount().catch(() => 0n),
      getUserCount().catch(() => 0n),
    ]).then(([m, p, u]) => setStats({ messages: Number(m), pods: Number(p), users: Number(u) }));
  }, []);

  const ctaText = isConnected ? 'Enter App' : 'Launch App';
  const ctaPath = isConnected ? '/home' : '/connect';

  return (
    <div className="min-h-screen bg-base">
      {/* Ambient gradient orbs for glass effect depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[20%] left-[15%] w-[500px] h-[400px] bg-cyan-primary/[0.04] blur-[150px] rounded-full" />
        <div className="absolute top-[60%] right-[10%] w-[400px] h-[350px] bg-cyan-primary/[0.03] blur-[130px] rounded-full" />
      </div>

      {/* ─── Floating Glass Nav ─── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-full px-5 h-12 flex items-center justify-between">
          <Link to="/" className="text-label font-display font-semibold">
            QF<span className="text-cyan-primary">Link</span>
          </Link>

          {/* Cmd+K hint */}
          <button
            onClick={() => useSpotlightStore.getState().open()}
            className="hidden md:flex items-center gap-2 h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-caption text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>Search</span>
            <kbd className="text-[10px] font-mono ml-1">⌘K</kbd>
          </button>

          <Link to={ctaPath}>
            <Button variant="primary" className="h-8 px-5 text-body-sm rounded-full">
              {ctaText}
            </Button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <div className="relative z-10 max-w-3xl mx-auto">
          {isConnected && qnsName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-body-sm text-text-secondary mb-4"
            >
              Welcome back, {qnsName.replace('.qf', '')}<span className="text-cyan-primary">.qf</span>
            </motion.p>
          )}

          <h1 className="font-display font-semibold text-[clamp(32px,6vw,56px)] leading-[1.1] text-text-primary">
            <StaggerText text="Every message, on-chain, forever" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-6 text-body text-text-secondary max-w-lg mx-auto"
          >
            Token-gated group chats, encrypted direct messages, no database, no server, just the chain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <Link to={ctaPath}>
              <Button variant="primary" className="h-11 px-8 rounded-full">
                {ctaText}
              </Button>
            </Link>
            <a href="#features" className="text-label text-text-secondary hover:text-text-primary transition-colors">
              Learn more ↓
            </a>
          </motion.div>
        </div>

        {/* Product preview */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-16 w-full max-w-md mx-auto relative z-10"
        >
          <ChatPreview />
        </motion.div>

        {/* Chain pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.5 }}
          className="mt-12 mb-8"
        >
          <ChainPulse />
        </motion.div>
      </section>

      {/* ─── Bento Feature Grid ─── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <FadeIn>
          <h2 className="font-display text-h1 text-text-primary text-center mb-4">
            Built for sovereign conversation
          </h2>
          <p className="text-body text-text-secondary text-center max-w-md mx-auto mb-12">
            Three pillars. Every message permanent. Every identity owned. Every community self-governed.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pods — large, spans 2 rows */}
          <FadeIn delay={0.1} className="md:row-span-2">
            <div className="h-full bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-xl p-6 md:p-8 hover:border-cyan-primary/20 transition-colors duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-5 text-cyan-primary">
                <PodIcon />
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-3">Pods</h3>
              <p className="text-body text-text-secondary leading-relaxed">
                Token-gated group chats where your QF holdings determine access. The more you hold, the deeper you go. Every message is an on-chain transaction that can never be deleted or censored.
              </p>
              <div className="mt-8 pt-4 border-t border-white/[0.06]">
                <p className="text-caption text-text-tertiary">
                  Categories: trading, tokens, NFTs, DeFi, gaming, builders, social, alpha
                </p>
              </div>
            </div>
          </FadeIn>

          {/* DMs */}
          <FadeIn delay={0.2}>
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-xl p-6 hover:border-cyan-primary/20 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-5 text-cyan-primary">
                <DMIcon />
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-2">Direct Messages</h3>
              <p className="text-body-sm text-text-secondary">
                Wallet-to-wallet encrypted messaging. No phone number, no email, no intermediary. Your keys, your conversations.
              </p>
            </div>
          </FadeIn>

          {/* Identity */}
          <FadeIn delay={0.3}>
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-xl p-6 hover:border-cyan-primary/20 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-5 text-cyan-primary">
                <IdentityIcon />
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-2">QNS Identity</h3>
              <p className="text-body-sm text-text-secondary">
                Human-readable <span className="text-cyan-primary">.qf</span> names instead of hex addresses. Claim yours and become recognizable on-chain.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <FadeIn>
          <h2 className="font-display text-h1 text-text-primary text-center mb-16">How it works</h2>
        </FadeIn>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px bg-white/[0.06]" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { num: '01', title: 'Connect', desc: 'Link your Substrate wallet. Your keys, your identity, your messages.' },
              { num: '02', title: 'Join', desc: 'Enter token-gated pods based on your QF holdings. The more you hold, the deeper you go.' },
              { num: '03', title: 'Speak', desc: 'Every message is an on-chain transaction. Nothing deleted, nothing censored, nothing lost.' },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.15}>
                <div className="text-center md:text-left">
                  <div className="flex justify-center md:justify-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center relative z-10">
                      <span className="text-caption text-cyan-primary font-medium">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="font-display text-h2 text-text-primary mb-2">{step.title}</h3>
                  <p className="text-body-sm text-text-secondary">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── On-Chain Stats ─── */}
      {(stats.messages > 0 || stats.pods > 0 || stats.users > 0) && (
        <section className="border-y border-white/[0.06] py-16">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.messages > 0 && (
              <FadeIn>
                <p className="font-display text-display text-text-primary">
                  <Counter target={stats.messages} suffix="+" />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Messages on-chain</p>
                <p className="text-caption text-text-tertiary mt-0.5">Every one permanent</p>
              </FadeIn>
            )}
            {stats.pods > 0 && (
              <FadeIn delay={0.1}>
                <p className="font-display text-display text-text-primary">
                  <Counter target={stats.pods} />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Active pods</p>
                <p className="text-caption text-text-tertiary mt-0.5">Token-gated communities</p>
              </FadeIn>
            )}
            {stats.users > 0 && (
              <FadeIn delay={0.2}>
                <p className="font-display text-display text-text-primary">
                  <Counter target={stats.users} />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Registered users</p>
                <p className="text-caption text-text-tertiary mt-0.5">And growing</p>
              </FadeIn>
            )}
          </div>
        </section>
      )}

      {/* ─── Live Pod Preview ─── */}
      {pods.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-24">
          <FadeIn>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-h1 text-text-primary">Live pods</h2>
              <Link to={ctaPath} className="text-label text-cyan-primary hover:text-cyan-hover transition-colors">
                View all →
              </Link>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pods.map((pod, i) => (
              <FadeIn key={pod.id.toString()} delay={i * 0.1}>
                <PodCard
                  pod={pod}
                  isOfficial={Number(pod.id) <= 3}
                  onClick={() => navigate(isConnected ? `/pod/${pod.id}` : '/connect')}
                />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* ─── Final CTA ─── */}
      <section className="py-24 text-center px-6">
        <FadeIn>
          <h2 className="font-display text-h1 md:text-display text-text-primary mb-4">
            The chain is waiting
          </h2>
          <p className="text-body text-text-secondary max-w-md mx-auto mb-8">
            Join the first fully on-chain messaging community. No sign-up, no email, just your wallet.
          </p>
          <Link to={ctaPath}>
            <Button variant="primary" className="h-12 px-10 text-body rounded-full">
              {ctaText}
            </Button>
          </Link>
        </FadeIn>
      </section>

      {/* ─── Ecosystem ─── */}
      <div className="text-center pb-8">
        <div className="flex items-center justify-center gap-8">
          <a href="https://qfnetwork.xyz" target="_blank" rel="noopener noreferrer"
            className="text-label text-text-secondary hover:text-cyan-primary transition-colors">
            QF Network ↗
          </a>
          <a href="https://dotqf.xyz" target="_blank" rel="noopener noreferrer"
            className="text-label text-text-secondary hover:text-cyan-primary transition-colors">
            Claim .qf name ↗
          </a>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span className="text-caption text-text-tertiary">
            Built on{' '}
            <a href="https://qfnetwork.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">
              QF Network
            </a>
          </span>
          <span className="text-caption text-text-tertiary">Sovereign. On-Chain. Yours.</span>
        </div>
      </footer>
    </div>
  );
}
