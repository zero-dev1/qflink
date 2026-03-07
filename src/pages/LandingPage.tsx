import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LandingNav } from '@/components/landing/LandingNav'
import { FooterCTA } from '@/components/landing/FooterCTA'
import { useInView } from '@/components/landing/useInView'

// ── Animated block (hero strip) ───────────────────────────────────────────────
const AnimatedBlock: React.FC<{ index: number; blockNum: number }> = ({ index, blockNum }) => (
  <div
    className="block-item flex flex-col items-center justify-center px-4 py-3 border border-cyan-600/30 bg-cyan-600/5 min-w-[100px]"
    style={{ animationDelay: `${index * 0.5}s` }}
  >
    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">Block</span>
    <span className="text-sm text-cyan-600 font-mono font-bold">#{blockNum.toLocaleString()}</span>
  </div>
)

// ── Use-case card ────────────────────────────────────────────────────────────
interface UseCaseCardProps {
  icon: React.ReactNode
  title: string
  text: string
  to: string
  delay: number
}
const UseCaseCard: React.FC<UseCaseCardProps> = ({ icon, title, text, to, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <Link to={to}>
      <div
        ref={ref}
        className={`group border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-8 hover:border-cyan-600 transition-all duration-700 cursor-pointer h-full ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className="text-cyan-600 mb-4">{icon}</div>
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 group-hover:text-cyan-600 transition-colors">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{text}</p>
        <div className="mt-4 text-cyan-600 text-sm font-semibold flex items-center gap-1">
          Learn more <span>→</span>
        </div>
      </div>
    </Link>
  )
}

// ── Feature block ─────────────────────────────────────────────────────────────
interface FeatureBlockProps {
  icon: React.ReactNode
  title: string
  text: string
  delay: number
}
const FeatureBlock: React.FC<FeatureBlockProps> = ({ icon, title, text, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-6 hover:border-cyan-600/50 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-cyan-600 mb-3">{icon}</div>
      <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{text}</p>
    </div>
  )
}

// ── Table comparison row ──────────────────────────────────────────────────────
interface CompRowProps {
  label: string
  qflink: string
  patreon: string
  whop: string
  discord: string
  highlight?: boolean
}
const CompRow: React.FC<CompRowProps> = ({ label, qflink, patreon, whop, discord, highlight }) => (
  <tr className={highlight ? 'bg-cyan-600/5' : ''}>
    <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">{label}</td>
    <td className="py-3 px-4 text-sm font-bold text-cyan-600 border-b border-gray-200 dark:border-gray-800">{qflink}</td>
    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">{patreon}</td>
    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">{whop}</td>
    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">{discord}</td>
  </tr>
)

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconCreator = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
  </svg>
)
const IconCommunity = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" />
    <path d="M2 20c0-3 3-5.5 7-5.5s7 2.5 7 5.5" strokeLinecap="round" />
    <path d="M16 14c2 0 5 1.5 5 4" strokeLinecap="round" />
  </svg>
)
const IconProject = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconMessage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconLock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconCoins = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
)
const IconDM = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 4h16v12H4z" rx="2" /><path d="M4 4l8 8 8-8" />
  </svg>
)
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconCompass = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)

// ── Main page ─────────────────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const [tableRef, tableInView] = useInView<HTMLDivElement>(0.05)
  const [featuresRef, featuresInView] = useInView<HTMLDivElement>(0.05)
  const [blockNumbers, setBlockNumbers] = useState([1847293, 1847294, 1847295, 1847296, 1847297])

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockNumbers(prev => prev.map(n => n + 1))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white">
      <style>{`
        @keyframes blockPulse {
          0%, 100% { opacity: 0.3; border-color: rgba(8,145,178,0.15); }
          50% { opacity: 1; border-color: rgba(8,145,178,0.5); }
        }
        .block-item { animation: blockPulse 3s ease-in-out infinite; }
        .block-item:nth-child(1) { animation-delay: 0s; }
        .block-item:nth-child(2) { animation-delay: 0.5s; }
        .block-item:nth-child(3) { animation-delay: 1s; }
        .block-item:nth-child(4) { animation-delay: 1.5s; }
        .block-item:nth-child(5) { animation-delay: 2s; }
        html { scroll-behavior: smooth; }
      `}</style>
      <LandingNav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.08) 0%, #0D0D0D 70%)' }} />
        <div className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.06) 0%, #FFFFFF 70%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center pt-20">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-gray-900 dark:text-white">
            <span className="block">Every Message.</span>
            <span className="block">On-Chain.</span>
            <span className="block">Forever.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            The first fully on-chain messaging app built on QF Network. Token-gated pods. Direct messages. No database. No server. Just the chain.
          </p>
          <div className="mt-10">
            <Link
              to="/connect"
              className="inline-block bg-cyan-600 text-white font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-700 transition-colors duration-200"
            >
              Launch App &rarr;
            </Link>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-3">
              Connect your wallet to start
            </p>
          </div>
          <div className="mt-16 flex items-center justify-center gap-2 flex-wrap">
            {blockNumbers.map((num, i) => (
              <AnimatedBlock key={i} index={i} blockNum={num} />
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── USE-CASE CARDS ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Who it's for</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Built for builders, creators, and communities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UseCaseCard
              icon={<IconCreator />}
              title="For Creators"
              text="Monetize your audience directly. Keep 95%. No monthly fees. No payment processors taking a cut."
              to="/creators"
              delay={0}
            />
            <UseCaseCard
              icon={<IconCommunity />}
              title="For Communities"
              text="Token-gated groups enforced by smart contracts, not bots. Your community can't be shut down."
              to="/communities"
              delay={100}
            />
            <UseCaseCard
              icon={<IconProject />}
              title="For Projects"
              text="Launch a token on QFPad, create a community on QFLink, trade on NucleuX. One ecosystem."
              to="/communities"
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ── FEE COMPARISON TABLE ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            ref={tableRef}
            className={`text-center mb-14 transition-all duration-700 ${tableInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">The numbers</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Stop losing money to platforms.
            </h2>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800">
            <table className="w-full bg-white dark:bg-[#0D0D0D]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600"></th>
                  <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-cyan-600">QFLink</th>
                  <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Patreon</th>
                  <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Whop</th>
                  <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Discord</th>
                </tr>
              </thead>
              <tbody>
                <CompRow label="Platform fee" qflink="5%" patreon="8–12%" whop="3%" discord="N/A" highlight />
                <CompRow label="Payment processing" qflink="Included" patreon="+2.9% + $0.30" whop="Included" discord="N/A" />
                <CompRow label="Monthly cost" qflink="$0" patreon="$0" whop="$0" discord="$0 (Nitro extra)" highlight />
                <CompRow label="Built-in chat" qflink="Yes" patreon="No (need Discord)" whop="Yes" discord="Yes" />
                <CompRow label="Built-in monetization" qflink="Yes" patreon="Yes" whop="Yes" discord="No" highlight />
                <CompRow label="Token gating" qflink="Smart contract" patreon="No" whop="No" discord="Bots (breakable)" />
                <CompRow label="Data ownership" qflink="You (on-chain)" patreon="Platform" whop="Platform" discord="Platform" highlight />
                <CompRow label="Can be shut down" qflink="No" patreon="Yes" whop="Yes" discord="Yes" />
                <CompRow label="Creator keeps" qflink="95%" patreon="85–92%" whop="~97%" discord="0%" highlight />
              </tbody>
            </table>
          </div>
          <p className="text-center mt-8 text-gray-500 dark:text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
            On Patreon, a creator earning $10,000/month loses up to $1,500 in fees. On QFLink, they lose $500.{' '}
            <span className="text-gray-900 dark:text-white font-semibold">That's $12,000/year back in your pocket.</span>
          </p>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div
            ref={featuresRef}
            className={`text-center mb-14 transition-all duration-700 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Features</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Everything on-chain. Nothing to lose.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureBlock
              icon={<IconMessage />}
              title="On-chain messages"
              text="Every message stored permanently on QF Network. No server to go down, no company to delete your history."
              delay={0}
            />
            <FeatureBlock
              icon={<IconLock />}
              title="Token gating"
              text="Smart contract verification of wallet balance. Not a bot that breaks. Not a role that gets revoked."
              delay={80}
            />
            <FeatureBlock
              icon={<IconCoins />}
              title="Paid communities"
              text="Set an entry fee. Get paid instantly on-chain. 95% goes to you — 5% to the protocol treasury."
              delay={160}
            />
            <FeatureBlock
              icon={<IconDM />}
              title="Direct messages"
              text="Wallet-to-wallet conversations stored on-chain. Private between participants — no central inbox to breach."
              delay={240}
            />
            <FeatureBlock
              icon={<IconShield />}
              title="Moderation"
              text="Ban, unban, add up to 3 moderators. Creators control their community — without overriding on-chain history."
              delay={320}
            />
            <FeatureBlock
              icon={<IconCompass />}
              title="Categories & Discovery"
              text="Browse pods by Trading, NFTs, DeFi, Gaming, Builders, Social, Alpha, and Tokens on the Explore page."
              delay={400}
            />
          </div>
        </div>
      </section>

      <FooterCTA />
    </div>
  )
}

export default LandingPage
