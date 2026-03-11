import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LandingNav } from '@/components/landing/LandingNav'
import { useInView } from '@/components/landing/useInView'

// ── Step card ─────────────────────────────────────────────────────────────────
interface StepCardProps {
  number: string
  title: string
  description: string
  delay: number
}
const StepCard: React.FC<StepCardProps> = ({ number, title, description, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-8 hover:border-cyan-600 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-cyan-600 text-4xl font-bold font-mono mb-4">{number}</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{description}</p>
    </div>
  )
}

// ── Comparison block ──────────────────────────────────────────────────────────
interface CompBlockProps {
  statement: string
  detail: string
  delay: number
}
const CompBlock: React.FC<CompBlockProps> = ({ statement, detail, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`border-l-2 border-cyan-600 pl-6 py-2 transition-all duration-700 ${
        inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{statement}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{detail}</p>
    </div>
  )
}

// ── Why Choose Item ───────────────────────────────────────────────────────────
interface WhyChooseItemProps {
  icon: React.ReactNode
  headline: string
  description: string
  delay: number
}
const WhyChooseItem: React.FC<WhyChooseItemProps> = ({ icon, headline, description, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-[#0991B2] mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{headline}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

// ── Icons for Why Choose section ──────────────────────────────────────────────
const IconOwnCommunity = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="2" fill="currentColor" />
  </svg>
)
const IconInstantPayouts = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)
const IconCensorshipProof = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)
const IconPortableIdentity = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
  </svg>
)
const IconNoKYC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" />
    <path d="M2 20c0-4 3.6-7 8-7s8 3 8 7" />
    <path d="M18 2l4 4M22 2l-4 4" />
  </svg>
)
const IconInstantMessaging = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
)

// ── Revenue calculator ────────────────────────────────────────────────────────
const RevenueCalculator: React.FC = () => {
  const [members, setMembers] = useState(100)
  const [entryFee, setEntryFee] = useState(500)
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  const gross = members * entryFee
  const creatorEarns = Math.floor(gross * 0.95)
  const treasury = Math.floor(gross * 0.05)

  // Competitor calculations (assuming 1 tx per member)
  // Whop: 3% + Stripe 2.7% + $0.30/tx = ~5.7% + $0.30/tx
  const whopFees = Math.floor(gross * 0.057 + members * 0.30)
  const whopKeeps = gross - whopFees

  // Patreon: 8-12% + processing 2.9% + $0.30/tx (using 10% avg platform fee)
  const patreonFeesLow = Math.floor(gross * (0.08 + 0.029) + members * 0.30)
  const patreonFeesHigh = Math.floor(gross * (0.12 + 0.029) + members * 0.30)
  const patreonKeepsLow = gross - patreonFeesHigh
  const patreonKeepsHigh = gross - patreonFeesLow

  const presets = [
    { members: 100, fee: 500 },
    { members: 500, fee: 500 },
    { members: 1000, fee: 1000 },
  ]

  return (
    <div
      ref={ref}
      className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-8 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Revenue Calculator</h3>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        {presets.map((p) => (
          <button
            key={`${p.members}-${p.fee}`}
            onClick={() => { setMembers(p.members); setEntryFee(p.fee) }}
            className={`px-4 py-2 text-sm font-semibold border transition-colors ${
              members === p.members && entryFee === p.fee
                ? 'border-cyan-600 bg-cyan-600/10 text-cyan-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-cyan-600 hover:text-cyan-600'
            }`}
          >
            {p.members} members × {p.fee} QF
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-5 mb-8">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <label className="text-gray-500 dark:text-gray-400">Members joining</label>
            <span className="font-bold text-gray-900 dark:text-white">{members.toLocaleString()}</span>
          </div>
          <input
            type="range" min="10" max="5000" step="10" value={members}
            onChange={(e) => setMembers(Number(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <label className="text-gray-500 dark:text-gray-400">Entry fee (QF)</label>
            <span className="font-bold text-gray-900 dark:text-white">{entryFee.toLocaleString()} QF</span>
          </div>
          <input
            type="range" min="100" max="10000" step="100" value={entryFee}
            onChange={(e) => setEntryFee(Number(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">You earn</div>
            <div className="text-4xl font-bold text-cyan-600">{creatorEarns.toLocaleString()} QF</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Protocol treasury</div>
            <div className="text-lg font-semibold text-gray-400">{treasury.toLocaleString()} QF</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-600">
          95% split — on-chain, instant, no invoice.
        </div>
      </div>

      {/* Competitor fee comparison */}
      <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-6">
        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Competitor total fees</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Whop total fees:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{whopFees.toLocaleString()} QF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Patreon total fees:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{patreonFeesLow.toLocaleString()}–{patreonFeesHigh.toLocaleString()} QF</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const CreatorsPage: React.FC = () => {
  const [heroRef, heroInView] = useInView<HTMLDivElement>(0.1)

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
            For Creators
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-gray-900 dark:text-white mb-6">
            Keep 95% of<br />
            <span className="text-cyan-600">what you earn.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
            No middlemen. No frozen payouts. No deplatforming. Create gated communities on-chain and get paid instantly to your wallet.
          </p>
          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-base px-10 py-4 hover:bg-cyan-700 transition-colors"
          >
            Get Started →
          </Link>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-4">
            500 QF one-time creation fee. No monthly charges.
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">How it works</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Three steps. That's it.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number="01"
              title="Create your pod"
              description="Pay 500 QF once. Pick a name, category, and description. Set an optional entry fee if you want to charge members for access."
              delay={0}
            />
            <StepCard
              number="02"
              title="Share your link"
              description="Send your pod link to your audience. They connect an EVM wallet and join. No app download. No account creation. Just a wallet."
              delay={100}
            />
            <StepCard
              number="03"
              title="Get paid instantly"
              description="95% of every entry fee goes directly to your wallet. On-chain. Instant. No invoices, no waiting periods, no minimum payouts."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ── REVENUE CALCULATOR ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Your numbers</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              See what you'd earn.
            </h2>
          </div>
          <RevenueCalculator />
          <div className="mt-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] p-6">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Quick examples</div>
            <div className="space-y-2">
              {[
                { members: 100, fee: 500, earns: 47500 },
                { members: 500, fee: 500, earns: 237500 },
                { members: 1000, fee: 1000, earns: 950000 },
              ].map((row) => (
                <div key={row.members} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {row.members.toLocaleString()} members × {row.fee.toLocaleString()} QF entry
                  </span>
                  <span className="font-bold text-cyan-600">
                    {row.earns.toLocaleString()} QF to you
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CREATORS CHOOSE QFLINK ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Built Different</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Why creators choose QFLink
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            <WhyChooseItem
              icon={<IconOwnCommunity />}
              headline="Own your community"
              description="Your pod, your members, your rules. No platform can take it away."
              delay={0}
            />
            <WhyChooseItem
              icon={<IconInstantPayouts />}
              headline="Instant payouts"
              description="Entry fees go straight to your wallet. No holds, no reserves, no schedule."
              delay={80}
            />
            <WhyChooseItem
              icon={<IconCensorshipProof />}
              headline="Censorship-proof"
              description="Your content lives on-chain. No content policies, no deplatforming risk."
              delay={160}
            />
            <WhyChooseItem
              icon={<IconPortableIdentity />}
              headline="Portable identity"
              description="Your .qf name works across the entire QF ecosystem, not just one app."
              delay={240}
            />
            <WhyChooseItem
              icon={<IconNoKYC />}
              headline="No KYC to earn"
              description="Connect your wallet and start earning. No identity checks, no bank accounts."
              delay={320}
            />
            <WhyChooseItem
              icon={<IconInstantMessaging />}
              headline="Instant messaging"
              description="Session keys let your members chat without wallet popups. Web3 power, Web2 smoothness."
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* ── WHY QFLINK VS PATREON/WHOP ── */}
      <section className="py-24 px-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">Why QFLink</div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Not all platforms are equal.
            </h2>
          </div>
          <div className="space-y-10">
            <CompBlock
              statement="Your community can be deleted overnight."
              detail="Whop, Patreon, and Skool own your community. They can freeze your account, hold your funds in reserves, or remove you without warning. On QFLink, your pod lives on-chain. Only you hold the keys."
              delay={0}
            />
            <CompBlock
              statement="You're building their audience, not yours."
              detail="Every member you gain on a Web2 platform belongs to that platform. Leave, and they stay behind. On QFLink, your .qf identity and your members are portable, permanent, and yours."
              delay={100}
            />
            <CompBlock
              statement="Getting paid shouldn't take weeks."
              detail="Stripe holds funds. Whop schedules payouts biweekly. Patreon batches monthly. On QFLink, entry fees settle to your wallet the moment someone joins. No banks, no reserves, no waiting."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ── FEE COMPARISON ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">The math</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              What $10,000/month really costs you
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { platform: 'QFLink', fee: '5%', keeps: '$9,500', subtitle: '5% treasury fee. That\'s it.', color: 'border-cyan-600' },
              { platform: 'Whop', fee: '~5.7%+', keeps: '~$9,400', subtitle: '3% platform + 2.7% processing + $0.30/tx', color: 'border-gray-300 dark:border-gray-700' },
              { platform: 'Patreon', fee: '11–15%+', keeps: '$8,800–$9,200', subtitle: '8–12% platform + 2.9% processing + $0.30/tx', color: 'border-gray-300 dark:border-gray-700' },
            ].map((p) => (
              <div key={p.platform} className={`border-2 ${p.color} bg-white dark:bg-[#0D0D0D] p-6 text-center`}>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{p.platform}</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{p.keeps}</div>
                <div className="text-sm text-gray-500">{p.subtitle}</div>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
            Whop and Patreon fees include payment processing (Stripe). QFLink's 5% is the only fee — no payment processor, no hidden costs.
          </p>
        </div>
      </section>

      {/* ── CREATOR DASHBOARD ── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
          Your command center
        </h2>
        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
          Create pods, manage members, set fees, track revenue — all from one dashboard.
        </p>
        <div className="border border-gray-800 overflow-hidden">
          <img 
            src="/creator-dashboard.png" 
            alt="QFLink Creator Dashboard" 
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </section>

      {/* ── PAGE FOOTER CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden text-center border-t border-gray-100 dark:border-gray-900">
        <div className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.07) 0%, #0D0D0D 70%)' }} />
        <div className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.05) 0%, #FFFFFF 70%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="font-display text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-10">
            Your audience is waiting.
          </h2>
          <Link
            to="/connect"
            className="inline-block bg-[#0991B2] text-white font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-600 transition-colors duration-200"
          >
            Launch your pod →
          </Link>
          <p className="text-gray-400 dark:text-gray-600 text-sm mt-4">
            500 QF one-time. No subscriptions. 95% yours.
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

export default CreatorsPage
