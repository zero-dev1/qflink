import React, { useState, useEffect } from 'react'
import { useInView } from './useInView'

export const FeatureOnChain: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)
  const [blockNumber, setBlockNumber] = useState(1847293)

  // Increment block number every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockNumber(prev => prev + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div 
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left side - Block visualization */}
          <div 
            className={`transition-all duration-700 ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-700 p-6 font-mono text-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
                <span className="text-gray-500 dark:text-gray-500">Block</span>
                <span className="text-gray-900 dark:text-white font-bold">#{blockNumber.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <div className="flex">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">Extrinsic:</span>
                  <span className="text-gray-700 dark:text-gray-300">contracts.call</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">Contract:</span>
                  <span className="text-gray-700 dark:text-gray-300">0x6dc8...a4b1</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">Method:</span>
                  <span className="text-gray-700 dark:text-gray-300">send_message</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">From:</span>
                  <span className="text-gray-700 dark:text-gray-300">5Grwva...utQY</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">Data:</span>
                  <span className="text-gray-700 dark:text-gray-300">0x8f2e...a7c1</span>
                </div>
                <div className="flex items-center pt-4 mt-4 border-t border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">Status:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Finalized
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Text */}
          <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-cyan-600 dark:text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4">
              #02 / Permanent Record
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-4">
              Messages that outlive servers.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-6 leading-relaxed">
              Every message you send is an on-chain transaction. No database to hack, no server to shut down, no company to go bankrupt. Your conversations exist as long as the QF Network exists. Fully verifiable, fully transparent.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
