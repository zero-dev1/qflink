import React from 'react'
import { useInView } from './useInView'

interface StatProps {
  value: string
  label: string
  delay: number
}

const Stat: React.FC<StatProps> = ({ value, label, delay }) => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-5xl font-bold text-cyan-600">{value}</div>
      <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-widest mt-2">{label}</div>
    </div>
  )
}

export const NetworkStats: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  const stats = [
    { value: '~100ms', label: 'Block Time' },
    { value: '<0.001 QF', label: 'Per Message' },
    { value: '100%', label: 'On-Chain' }
  ]

  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <h2 
          ref={ref}
          className={`font-display text-3xl md:text-5xl font-bold text-gray-900 dark:text-white text-center mb-16 transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Built on QF Network
        </h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <Stat
              key={stat.label}
              value={stat.value}
              label={stat.label}
              delay={i * 100}
            />
          ))}
        </div>

        {/* Description */}
        <p className="text-gray-400 dark:text-gray-500 text-center mt-8 max-w-xl mx-auto">
          Substrate-native. EVM-compatible smart contracts via pallet-revive. Secured by nominated proof-of-stake.
        </p>
      </div>
    </section>
  )
}
