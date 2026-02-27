import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Animated block component for the hero block strip
const AnimatedBlock: React.FC<{ index: number; blockNum: number }> = ({ index, blockNum }) => {
  return (
    <div 
      className="block-item flex flex-col items-center justify-center px-4 py-3 border border-cyan-600/30 dark:border-cyan-400/30 bg-cyan-600/5 dark:bg-cyan-400/5 min-w-[100px]"
      style={{ animationDelay: `${index * 0.5}s` }}
    >
      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Block</span>
      <span className="text-sm text-cyan-600 dark:text-cyan-400 font-mono font-bold">#{blockNum.toLocaleString()}</span>
    </div>
  )
}

export const HeroSection: React.FC = () => {
  const [blockNumbers, setBlockNumbers] = useState([1847293, 1847294, 1847295, 1847296, 1847297])

  // Increment block numbers slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockNumbers(prev => prev.map(n => n + 1))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Radial gradient glow - Dark mode */}
      <div 
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,229,255,0.08) 0%, #0D0D0D 70%)'
        }}
      />
      {/* Radial gradient glow - Light mode */}
      <div 
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,229,255,0.04) 0%, #FFFFFF 70%)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center pt-20">
        {/* Headline */}
        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-gray-900 dark:text-white">
          <span className="block">Every Message.</span>
          <span className="block">On-Chain.</span>
          <span className="block">Forever.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed">
          The first fully on-chain messaging app built on QF Network. Token-gated pods. Direct messages. No database. No server. Just the chain.
        </p>

        {/* CTA Button */}
        <div className="mt-10">
          <Link
            to="/home"
            className="inline-block bg-cyan-600 dark:bg-cyan-400 text-white dark:text-black font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-500 dark:hover:bg-cyan-300 transition-colors duration-200"
          >
            Launch App &rarr;
          </Link>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-3">
            Connect your Substrate wallet to start
          </p>
        </div>

        {/* Animated block strip */}
        <div className="mt-16 flex items-center justify-center gap-2 flex-wrap">
          {blockNumbers.map((num, i) => (
            <AnimatedBlock key={i} index={i} blockNum={num} />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="animate-bounce">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="text-gray-400 dark:text-gray-600"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </section>
  )
}
