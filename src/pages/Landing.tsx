// src/pages/Landing.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { PodCard } from '@/components/pods/PodCard';
import { Button } from '@/components/ui/Button';
import { getAllPods, getMessageCount, getUserCount, getPodCount } from '@/lib/contractCalls';
import type { PodData } from '@/lib/contractCalls';

// ── Animation Variants ──
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ── StaggerText (letter-by-letter hero headline) ──
function StaggerText({ text, className }: { text: string; className?: string }) {
  // Split into WORDS first, then letters within words
  // This prevents mid-word breaks like "forev er"
  const words = text.split(' ');

  return (
    <motion.span
      aria-label={text}
      role="heading"
      className={className}
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
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 200 } },
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

// ── FadeIn on scroll ──
function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated Counter ──
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || target === 0) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    }

    requestAnimationFrame(tick);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ── Main Landing Page ──
export default function Landing() {
  const navigate = useNavigate();
  const { isConnected, qnsName } = useWalletStore();
  const [pods, setPods] = useState<PodData[]>([]);
  const [stats, setStats] = useState({ messages: 0, pods: 0, users: 0 });

  // Fetch real data
  useEffect(() => {
    getAllPods().then((p) => setPods(p.slice(0, 3))).catch(() => {});
    Promise.all([
      getMessageCount().catch(() => 0n),
      getPodCount().catch(() => 0n),
      getUserCount().catch(() => 0n),
    ]).then(([msgs, pods, users]) => {
      setStats({
        messages: Number(msgs),
        pods: Number(pods),
        users: Number(users),
      });
    });
  }, []);

  const ctaText = isConnected ? 'Enter App' : 'Launch App';
  const ctaPath = isConnected ? '/home' : '/connect';
  const greeting = isConnected && qnsName
    ? <>Welcome back, {qnsName.replace('.qf', '')}<span className="text-cyan-primary">.qf</span></>
    : null;

  return (
    <div className="min-h-screen bg-base">
      {/* ─── Sticky Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-base/80 backdrop-blur-md border-b border-border-subtle z-50">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
          <Link to="/" className="text-h3 font-display font-semibold">
            QF<span className="text-cyan-primary">Link</span>
          </Link>
          <Link to={ctaPath}>
            <Button variant="primary" className="h-9 px-5 text-body-sm">
              {ctaText}
            </Button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        {/* Subtle radial gradient glow behind headline */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {greeting && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-body-sm text-text-secondary mb-4"
            >
              {greeting}
            </motion.p>
          )}

          <h1 className="font-display text-[clamp(32px,6vw,56px)] font-semibold leading-[1.1] text-text-primary">
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
              <Button variant="primary" className="h-11 px-8">
                {ctaText}
              </Button>
            </Link>
            <a
              href="#features"
              className="text-label text-text-secondary hover:text-text-primary transition-colors"
            >
              Learn more ↓
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5, y: [0, 8, 0] }}
          transition={{ delay: 2.0, y: { repeat: Infinity, duration: 1.5 } }}
          className="absolute bottom-8"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-tertiary" />
          </svg>
        </motion.div>
      </section>

      {/* ─── Bento Feature Grid ─── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <FadeIn>
          <h2 className="font-display text-h1 text-text-primary text-center mb-12">
            Built for sovereign conversation
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Large card — Pods (spans full width on mobile, left column on desktop) */}
          <FadeIn delay={0.1} className="md:row-span-2">
            <div className="h-full bg-surface-2 border border-border-subtle rounded-lg p-6 md:p-8 hover:border-cyan-border/40 transition-colors duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-4">
                <span className="text-cyan-primary text-lg">◈</span>
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-2">Pods</h3>
              <p className="text-body text-text-secondary leading-relaxed">
                Token-gated group chats where your QF holdings determine access. The more you hold, the deeper you go. Every message is an on-chain transaction that can never be deleted or censored.
              </p>
              <div className="mt-6 pt-4 border-t border-border-subtle">
                <p className="text-caption text-text-tertiary">
                  Categories: trading, tokens, NFTs, DeFi, gaming, builders, social, alpha
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Medium card — DMs */}
          <FadeIn delay={0.2}>
            <div className="bg-surface-2 border border-border-subtle rounded-lg p-6 hover:border-cyan-border/40 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-4">
                <span className="text-cyan-primary text-lg">◇</span>
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-2">Direct Messages</h3>
              <p className="text-body-sm text-text-secondary">
                Wallet-to-wallet encrypted messaging. No phone number, no email, no intermediary. Your keys, your conversations.
              </p>
            </div>
          </FadeIn>

          {/* Medium card — Identity */}
          <FadeIn delay={0.3}>
            <div className="bg-surface-2 border border-border-subtle rounded-lg p-6 hover:border-cyan-border/40 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center mb-4">
                <span className="text-cyan-primary text-lg">⬡</span>
              </div>
              <h3 className="font-display text-h2 text-text-primary mb-2">
                QNS Identity
              </h3>
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
          <h2 className="font-display text-h1 text-text-primary text-center mb-16">
            How it works
          </h2>
        </FadeIn>

        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px bg-border-subtle" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { num: '01', title: 'Connect', desc: 'Link your Substrate wallet. Your keys, your identity, your messages.' },
              { num: '02', title: 'Join', desc: 'Enter token-gated pods based on your QF holdings. The more you hold, the deeper you go.' },
              { num: '03', title: 'Speak', desc: 'Every message is an on-chain transaction. Nothing deleted, nothing censored, nothing lost.' },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.15}>
                <div className="text-center md:text-left">
                  {/* Step dot */}
                  <div className="flex justify-center md:justify-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center relative z-10">
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
        <section className="border-y border-border-subtle py-16">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.messages > 0 && (
              <FadeIn>
                <p className="font-display text-display text-text-primary">
                  <AnimatedCounter target={stats.messages} suffix="+" />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Messages on-chain</p>
              </FadeIn>
            )}
            {stats.pods > 0 && (
              <FadeIn delay={0.1}>
                <p className="font-display text-display text-text-primary">
                  <AnimatedCounter target={stats.pods} />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Active pods</p>
              </FadeIn>
            )}
            {stats.users > 0 && (
              <FadeIn delay={0.2}>
                <p className="font-display text-display text-text-primary">
                  <AnimatedCounter target={stats.users} />
                </p>
                <p className="text-body-sm text-text-secondary mt-1">Registered users</p>
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
              <Link
                to={isConnected ? '/explore' : '/connect'}
                className="text-label text-cyan-primary hover:text-cyan-hover transition-colors"
              >
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
            <Button variant="primary" className="h-12 px-10 text-body">
              {ctaText}
            </Button>
          </Link>
        </FadeIn>
      </section>

      {/* ─── Ecosystem Links ─── */}
      <div className="text-center pb-8">
        <div className="flex items-center justify-center gap-8">
          <a
            href="https://qfnetwork.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label text-text-secondary hover:text-cyan-primary transition-colors"
          >
            QF Network ↗
          </a>
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label text-text-secondary hover:text-cyan-primary transition-colors"
          >
            Claim .qf name ↗
          </a>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border-subtle py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span className="text-caption text-text-tertiary">
            Built on{' '}
            <a href="https://qfnetwork.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">
              QF Network
            </a>
          </span>
          <span className="text-caption text-text-tertiary">
            Sovereign. On-Chain. Yours.
          </span>
        </div>
      </footer>
    </div>
  );
}
