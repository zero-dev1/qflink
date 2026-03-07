import React, { useState } from 'react'
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

// ── Revenue calculator ────────────────────────────────────────────────────────
const RevenueCalculator: React.FC = () => {
  const [members, setMembers] = useState(100)
  const [entryFee, setEntryFee] = useState(500)
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  const gross = members * entryFee
  const creatorEarns = Math.floor(gross * 0.95)
  const treasury = Math.floor(gross * 0.05)

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
            Patreon takes up to 15%. Discord takes your community and gives you nothing. QFLink gives you both — community AND revenue — and only takes 5%.
          </p>
          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-base px-10 py-4 hover:bg-cyan-700 transition-colors"
          >
            Start Earning →
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
              statement="No monthly fees, ever."
              detail="Patreon charges a monthly platform fee on top of transaction fees. QFLink charges nothing monthly. Pay 500 QF once to create your pod, then keep 95% of every entry fee. Forever."
              delay={0}
            />
            <CompBlock
              statement="Your community can't be deleted."
              detail="Patreon can ban creators without notice. Discord can nuke your server. QFLink communities live on the blockchain — no company can delete your members, your history, or your access."
              delay={100}
            />
            <CompBlock
              statement="No payment processors."
              detail="No Stripe. No PayPal. No chargebacks. No bank holds. Members pay in QF tokens directly to your wallet, on-chain, the moment they join. Zero intermediaries."
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
              { platform: 'QFLink', fee: '5%', keeps: '$9,500', color: 'border-cyan-600' },
              { platform: 'Whop', fee: '3%', keeps: '$9,700', color: 'border-gray-300 dark:border-gray-700' },
              { platform: 'Patreon', fee: '8–15%+', keeps: '$8,500–$9,200', color: 'border-gray-300 dark:border-gray-700' },
            ].map((p) => (
              <div key={p.platform} className={`border-2 ${p.color} bg-white dark:bg-[#0D0D0D] p-6 text-center`}>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{p.platform}</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{p.keeps}</div>
                <div className="text-sm text-gray-500">you keep ({p.fee} fee)</div>
                {p.platform === 'Patreon' && (
                  <div className="text-xs text-gray-400 mt-2">+ payment processing</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-gray-500 dark:text-gray-500 max-w-xl mx-auto">
            The difference between Patreon's top rate and QFLink is{' '}
            <span className="text-gray-900 dark:text-white font-bold">$12,000/year</span> on $10k/month revenue. That's real money.
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
          <h2 className="font-display text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-10">
            Your audience is waiting.
          </h2>
          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-700 transition-colors duration-200"
          >
            Create Your Pod &rarr;
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
