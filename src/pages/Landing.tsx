// src/pages/Landing.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { PodCard } from '@/components/pods/PodCard';
import { getAllPods } from '@/lib/contractCalls';
import { cn } from '@/lib/utils';
import type { PodData } from '@/stores/pods';

// ── Letter-stagger animation ────────────────────────────────────────
function StaggerText({ text, className }: { text: string; className?: string }) {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.1 },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 12, stiffness: 200 },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn('inline-flex flex-wrap justify-center', className)}
      aria-label={text}
    >
      {letters.map((letter, i) => (
        <motion.span key={i} variants={child} className="inline-block">
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ── Fade-up wrapper for below-fold sections ─────────────────────────
function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── How It Works data ───────────────────────────────────────────────
const STEPS = [
  { num: '01', title: 'Connect', desc: 'Link your Substrate wallet. Your keys, your identity, your messages.' },
  { num: '02', title: 'Join', desc: 'Enter token-gated pods based on your QF holdings. The more you hold, the deeper you go.' },
  { num: '03', title: 'Speak', desc: 'Every message is an on-chain transaction. Nothing deleted, nothing censored, nothing lost.' },
];

// ── Ecosystem links ─────────────────────────────────────────────────
const ECOSYSTEM = [
  { label: 'QF Network', href: 'https://qfnetwork.xyz' },
  { label: 'Claim .qf name', href: 'https://dotqf.xyz' },
];

// ── Page ─────────────────────────────────────────────────────────────
export default function Landing() {
  const { isConnected, qnsName } = useWalletStore();
  const [pods, setPods] = useState<PodData[]>([]);

  // Fetch first 3 pods for preview section
  useEffect(() => {
    getAllPods()
      .then((all) => {
        const sorted = [...all].sort((a, b) => Number(a.id) - Number(b.id));
        setPods(sorted.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const ctaTo = isConnected ? '/home' : '/connect';
  const ctaLabel = isConnected ? 'Enter App' : 'Get Started';

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* ─── Sticky Nav ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-12 h-16 bg-base/80 backdrop-blur-sm border-b border-border-subtle">
        <Link to="/" className="text-h2 font-display text-text-primary">
          QF<span className="text-cyan-primary">Link</span>
        </Link>
        <Link
          to={ctaTo}
          className="h-10 px-6 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          {isConnected ? 'Enter App' : 'Launch App'}
        </Link>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[calc(100vh-64px)]">
        <h1 className="font-display text-display md:text-[48px] md:leading-[1.1] text-text-primary max-w-3xl">
          <StaggerText text="Every message, on-chain, forever" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-5 text-body text-text-secondary max-w-lg"
        >
          Token-gated group chats, encrypted direct messages, no database, no server, just the chain.
        </motion.p>

        {/* Returning user welcome */}
        {isConnected && qnsName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="mt-3 text-body-sm text-text-tertiary"
          >
            Welcome back, {qnsName.replace('.qf', '')}
            <span className="text-cyan-primary">.qf</span>
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.4 }}
        >
          <Link
            to={ctaTo}
            className="mt-8 h-12 px-10 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover active:bg-cyan-pressed transition-colors"
          >
            {ctaLabel}
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          className="mt-16 text-text-tertiary"
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M10 4L10 16M10 16L5 11M10 16L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 max-w-content-wide mx-auto w-full">
        <FadeUp>
          <h2 className="font-display text-h1 text-text-primary text-center">
            How it works
          </h2>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {STEPS.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.15}>
              <div className="flex flex-col">
                <span className="text-caption text-cyan-primary">{step.num}</span>
                <h3 className="mt-2 text-h2 font-display text-text-primary">{step.title}</h3>
                <p className="mt-3 text-body text-text-secondary">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── Pod Preview ─────────────────────────────────────────── */}
      {pods.length > 0 && (
        <section className="px-6 md:px-12 py-24 max-w-content-wide mx-auto w-full">
          <FadeUp>
            <h2 className="font-display text-h1 text-text-primary text-center">
              Explore the network
            </h2>
            <p className="mt-3 text-body text-text-secondary text-center">
              Join the conversation in token-gated pods
            </p>
          </FadeUp>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {pods.map((pod, i) => (
              <FadeUp key={Number(pod.id)} delay={i * 0.1}>
                <Link to={isConnected ? `/pod/${pod.id}` : '/connect'}>
                  <PodCard
                    pod={pod}
                    isOfficial={Number(pod.id) <= 3}
                    onClick={() => {}}
                  />
                </Link>
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {/* ─── Ecosystem ───────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 max-w-content-wide mx-auto w-full">
        <FadeUp>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {ECOSYSTEM.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-label text-text-secondary hover:text-cyan-primary transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-6 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-caption text-text-tertiary">
          Built on <a href="https://qfnetwork.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">QF Network</a>
        </p>
        <p className="text-caption text-text-tertiary">
          Sovereign. On-Chain. Yours.
        </p>
      </footer>
    </div>
  );
}
