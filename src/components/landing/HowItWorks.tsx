import React from 'react'
import { useInView } from './useInView'

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
      className={`bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-700 p-8 rounded-none transition-all duration-700 hover:border-cyan-600 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-cyan-600 text-4xl font-bold mb-4">{number}</div>
      <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

export const HowItWorks: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  const steps = [
    {
      number: '01',
      title: 'Connect Wallet',
      description: 'Link your Talisman or SubWallet. Your Substrate address is your identity. No email, no password, no account creation.'
    },
    {
      number: '02',
      title: 'Join or Create Pods',
      description: 'Access token-gated group chats based on your QF balance. Or create your own pod with custom thresholds.'
    },
    {
      number: '03',
      title: 'Send Messages',
      description: 'Every message is a transaction. Stored on-chain, verifiable, permanent. Direct messages are encrypted end-to-end.'
    }
  ]

  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div 
          ref={ref}
          className={`mb-16 transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-cyan-600 text-xs font-mono uppercase tracking-[0.2em] mb-4">
            How It Works
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Chat infrastructure that lives on the blockchain
          </h2>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <StepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              delay={i * 100}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
