import React from 'react'
import { Link } from 'react-router-dom'
import { LandingNav } from '@/components/landing/LandingNav'
import { useInView } from '@/components/landing/useInView'

// ── Why-switch block ──────────────────────────────────────────────────────────
interface WhyBlockProps {
  icon: React.ReactNode
  title: string
  text: string
  delay: number
}
const WhyBlock: React.FC<WhyBlockProps> = ({ icon, title, text, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-8 hover:border-cyan-600 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-cyan-600 mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{text}</p>
    </div>
  )
}

// ── Pod type card ─────────────────────────────────────────────────────────────
interface PodTypeCardProps {
  name: string
  badge: string
  badgeColor: string
  description: string
  detail: string
  example?: string
  delay: number
}
const PodTypeCard: React.FC<PodTypeCardProps> = ({ name, badge, badgeColor, description, detail, example, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-6 hover:border-cyan-600/50 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">{name}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 border ${badgeColor}`}>{badge}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{description}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mb-2">{detail}</p>
      {example && <p className="text-gray-600 dark:text-gray-600 text-xs italic">{example}</p>}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconContract = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
)
const IconChain = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)
const IconCoins = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
)
const IconServer = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <rect x="2" y="11" width="20" height="5" rx="1" />
    <line x1="6" y1="5.5" x2="6" y2="5.5" strokeLinecap="round" strokeWidth="2" />
    <line x1="6" y1="13.5" x2="6" y2="13.5" strokeLinecap="round" strokeWidth="2" />
    <line x1="2" y1="21" x2="22" y2="21" />
    <line x1="7" y1="19" x2="7" y2="21" />
    <line x1="17" y1="19" x2="17" y2="21" />
  </svg>
)

// ── Main page ─────────────────────────────────────────────────────────────────
const CommunitiesPage: React.FC = () => {
  const [heroRef, heroInView] = useInView<HTMLDivElement>(0.1)
  const [typesRef, typesInView] = useInView<HTMLDivElement>(0.05)

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white">
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <LandingNav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden text-center">
        <div className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.09) 0%, #0D0D0D 70%)' }} />
        <div className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.06) 0%, #FFFFFF 70%)' }} />

        <div
          ref={heroRef}
          className={`relative z-10 max-w-4xl mx-auto transition-all duration-700 ${
            heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-block border border-cyan-600/30 bg-cyan-600/5 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-cyan-600 mb-8">
            For Communities
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-gray-900 dark:text-white mb-6">
            A community that<br />
            <span className="text-cyan-600">can't be shut down.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-2">
            Discord and Telegram can delete your community overnight.
          </p>
          <p className="text-lg md:text-xl text-white max-w-2xl mx-auto leading-relaxed mb-10">
            QFLink can't — because no one controls it but you.
          </p>
          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-base px-10 py-4 hover:bg-cyan-700 transition-colors"
          >
            Create Your Community →
          </Link>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-4">
            500 QF once. Yours on-chain forever.
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── WHY SWITCH ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Why switch</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Discord and Telegram can't do this.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WhyBlock
              icon={<IconContract />}
              title="Real token gating."
              text="Discord uses Collab.Land bots that break, go offline, and can be bypassed. QFLink checks your wallet balance at the smart contract level — no bot, no workaround, no exceptions."
              delay={0}
            />
            <WhyBlock
              icon={<IconChain />}
              title="Permanent history."
              text="Discord deletes old messages. Servers get nuked overnight. QFLink messages are stored on-chain forever. Your community's history is permanent, verifiable, and owned by no company."
              delay={100}
            />
            <WhyBlock
              icon={<IconCoins />}
              title="Built-in monetization."
              text="Discord gives creators zero revenue tools. QFLink lets you charge an entry fee and keep 95% — instantly, on-chain, with no payment processor or approval required."
              delay={200}
            />
            <WhyBlock
              icon={<IconServer />}
              title="No single point of failure."
              text="Discord goes down and your community goes dark. QFLink runs on QF Network blockchain infrastructure. As long as the chain runs, your community exists — unconditionally."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ── PLATFORM COMPARISON ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Side by side</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              How QFLink compares
            </h2>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800">
            <table className="w-full bg-white dark:bg-[#0D0D0D] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-4 px-5 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Feature</th>
                  <th className="py-4 px-5 text-left text-xs font-bold uppercase tracking-widest text-cyan-600">QFLink</th>
                  <th className="py-4 px-5 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Discord</th>
                  <th className="py-4 px-5 text-left text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">Telegram</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Can be banned / shut down', qf: 'No', discord: 'Yes', telegram: 'Yes', hl: true },
                  { feature: 'Message history permanent', qf: 'Yes (on-chain)', discord: 'No', telegram: 'No', hl: false },
                  { feature: 'Token gating', qf: 'Smart contract', discord: 'Bots only', telegram: 'None', hl: true },
                  { feature: 'Data ownership', qf: 'You', discord: 'Discord Inc.', telegram: 'Telegram', hl: false },
                  { feature: 'Creator monetization', qf: '95% entry fees', discord: 'None', telegram: 'Stars (limited)', hl: true },
                  { feature: 'Moderation', qf: 'On-chain ban/unban', discord: 'Server tools', telegram: 'Admin tools', hl: false },
                  { feature: 'Works without servers', qf: 'Yes', discord: 'No', telegram: 'No', hl: true },
                ].map((row) => (
                  <tr key={row.feature} className={row.hl ? 'bg-[#0991B2]/10' : ''}>
                    <td className="py-3 px-5 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">{row.feature}</td>
                    <td className={`py-3 px-5 font-bold border-b border-gray-200 dark:border-gray-800 ${row.feature === 'Can be banned / shut down' ? 'text-[#0991B2]' : 'text-cyan-600'}`}>{row.qf}</td>
                    <td className="py-3 px-5 text-gray-500 border-b border-gray-200 dark:border-gray-800">{row.discord}</td>
                    <td className="py-3 px-5 text-gray-500 border-b border-gray-200 dark:border-gray-800">{row.telegram}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── POD TYPES ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div
            ref={typesRef}
            className={`text-center mb-14 transition-all duration-700 ${
              typesInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Pod types</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Every community has a home here.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <PodTypeCard
              name="Open Pod"
              badge="Free to join"
              badgeColor="border-gray-300 dark:border-gray-700 text-gray-500"
              description="Free to join. Like a public Discord channel — open to anyone with a wallet."
              detail="No token gate. No entry fee. Public on the Explore page."
              example='e.g., "Solana Builders", "QF General Chat"'
              delay={0}
            />
            <PodTypeCard
              name="Token-Gated Pod"
              badge="Holders only"
              badgeColor="border-cyan-600/50 text-cyan-600"
              description="Only wallets holding a minimum token balance can join. Works with QF and any token on the network. Verified by smart contract at join time. No bots."
              detail="e.g. min 10,000 QF or any token. Contract-enforced."
              example='e.g., "Diamond Hands Club", "NFT Holders Only"'
              delay={100}
            />
            <PodTypeCard
              name="Paid Pod"
              badge="Entry fee"
              badgeColor="border-cyan-600/50 text-cyan-600"
              description="Set an entry fee in QF. Premium content, alpha groups, exclusive access. 95% goes to you instantly."
              detail="e.g. 500 QF entry. 95% to creator, 5% to treasury."
              example='e.g., "Alpha Trading Group", "DeFi Masterclass"'
              delay={200}
            />
            <PodTypeCard
              name="Whale Pod"
              badge="High threshold"
              badgeColor="border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
              description="High token-gate threshold for inner-circle access. The most exclusive tier. Enforced on-chain."
              detail="e.g. 1,000,000 QF required. The inner circle."
              example='e.g., "Core Team", "Founders Circle"'
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Browse by category</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-10">
            Find your people on the Explore page.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Trading', 'Tokens', 'NFTs', 'DeFi', 'Gaming', 'Builders', 'Social', 'Alpha'].map((cat) => (
              <Link
                key={cat}
                to={`/explore?category=${cat}`}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-cyan-600 hover:text-cyan-600 transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-8">
            Every pod you create appears on the QFLink Explore page for its category.
          </p>
        </div>
      </section>

      {/* ── PAGE FOOTER CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden text-center border-t border-gray-100 dark:border-gray-900">
        <div className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.07) 0%, #0D0D0D 70%)' }} />
        <div className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.05) 0%, #FFFFFF 70%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="font-display text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Your community deserves better.
          </h2>
          <p className="text-gray-400 text-base mb-10 text-center max-w-2xl mx-auto">
            On-chain communities with permanent messages, encrypted DMs, and zero platform risk.
          </p>
          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-700 transition-colors duration-200"
          >
            Get Started &rarr;
          </Link>
          <p className="text-gray-400 dark:text-gray-600 text-sm mt-4">
            500 QF once. No recurring fees. On-chain forever.
          </p>
        </div>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 dark:text-white font-bold">QFLink</span>
              <span className="text-gray-400 dark:text-gray-600 text-sm">&copy; 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/connect" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">App</Link>
              <Link to="/creators" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">Creators</Link>
              <Link to="/communities" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">Communities</Link>
              <Link to="/whitepaper" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">Whitepaper</Link>
              <a href="https://qfnetwork.xyz" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">QF Network</a>
            </div>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default CommunitiesPage
