import React from 'react'
import { useInView } from './useInView'

interface PodMockupProps {
  name: string
  threshold: string
  subtitle: string
  isQualified: boolean
  isComingSoon?: boolean
}

const PodMockup: React.FC<PodMockupProps> = ({ name, threshold, subtitle, isQualified, isComingSoon }) => {
  return (
    <div className={`bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-700 p-4 rounded-none ${isComingSoon ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-900 dark:text-white font-semibold">{name}</span>
        <span className={`font-mono text-sm ${isComingSoon ? 'text-gray-500' : 'text-cyan-600'}`}>{threshold}</span>
      </div>
      <p className="text-gray-500 dark:text-gray-500 text-sm mb-2">{subtitle}</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 ${isQualified ? 'bg-cyan-600' : isComingSoon ? 'bg-gray-400 dark:bg-gray-600' : 'bg-gray-400 dark:bg-gray-600'}`} />
        <span className={`text-xs ${isQualified ? 'text-cyan-600' : isComingSoon ? 'text-gray-500 uppercase tracking-wider' : 'text-gray-400 dark:text-gray-500'}`}>
          {isQualified ? 'Qualified' : isComingSoon ? 'Coming Soon' : `${threshold.replace('+', '')} Required`}
        </span>
      </div>
    </div>
  )
}

export const FeatureTokenGated: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  const pods = [
    { name: "Chefs' Kitchen", threshold: '10,000+ QF', subtitle: 'For token holders', isQualified: true },
    { name: 'Whale Lounge', threshold: '1,000,000+ QF', subtitle: 'For serious holders', isQualified: false },
    { name: 'Builders', threshold: 'Contract Deployer', subtitle: 'For developers building on QF Network', isQualified: false, isComingSoon: true }
  ]

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div 
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left side - Text */}
          <div className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-cyan-600 font-mono text-xs uppercase tracking-[0.2em] mb-4">
              #01 / Token-Gated Access
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-4">
              Your balance is your badge.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-6 leading-relaxed">
              Pods are group chats gated by QF token holdings. Hold 10,000+ QF and you're in the Chefs' Kitchen. 1,000,000+ opens the Whale Lounge. Deploy a contract to join the Builders. No applications, no approvals — your wallet balance speaks for itself.
            </p>
          </div>

          {/* Right side - Pod mockups */}
          <div 
            className={`space-y-3 transition-all duration-700 delay-200 ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {pods.map((pod) => (
              <PodMockup
                key={pod.name}
                name={pod.name}
                threshold={pod.threshold}
                subtitle={pod.subtitle}
                isQualified={pod.isQualified}
                isComingSoon={pod.isComingSoon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
