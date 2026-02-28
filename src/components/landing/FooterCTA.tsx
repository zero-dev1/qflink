import React from 'react'
import { Link } from 'react-router-dom'
import { useInView } from './useInView'

export const FooterCTA: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Radial gradient glow - dimmer than hero - Dark mode */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50 hidden dark:block"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.08) 0%, #0D0D0D 70%)'
        }}
      />
      {/* Radial gradient glow - Light mode */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50 dark:hidden"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.06) 0%, #FFFFFF 70%)'
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* CTA Content */}
        <div 
          ref={ref}
          className={`text-center transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="font-display text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-10">
            Start chatting on-chain.
          </h2>

          <Link
            to="/connect"
            className="inline-block bg-cyan-600 text-white font-bold text-lg px-8 py-3 rounded-none hover:bg-cyan-700 transition-colors duration-200"
          >
            Launch App &rarr;
          </Link>

          <p className="text-gray-400 dark:text-gray-600 text-sm mt-4">
            Free to use. Just connect a wallet and hold QF.
          </p>
        </div>

        {/* Footer bar */}
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 dark:text-white font-bold">QFLink</span>
              <span className="text-gray-400 dark:text-gray-600 text-sm">&copy; 2026</span>
            </div>

            <div className="flex items-center gap-6">
              <Link 
                to="/connect" 
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                App
              </Link>
              <a 
                href="https://qfnetwork.xyz" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                QF Network
              </a>
            </div>
          </div>
        </footer>
      </div>
    </section>
  )
}
