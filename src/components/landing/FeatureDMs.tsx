import React from 'react'
import { useInView } from './useInView'

export const FeatureDMs: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

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
              #03 / Private Channels
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-4">
              DM any wallet. Encrypted.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-6 leading-relaxed">
              Paste any Substrate address to start a direct conversation. Messages are encrypted — only sender and recipient can read them. No middleman. No metadata harvesting. Just peer-to-peer, on-chain.
            </p>
          </div>

          {/* Right side - Chat mockup */}
          <div 
            className={`transition-all duration-700 delay-200 ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-700 rounded-none overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-transparent border border-cyan-600 flex items-center justify-center">
                  <span className="text-cyan-600 text-xs font-bold">A</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">Alice</span>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-4 min-h-[200px]">
                {/* Sent message */}
                <div className="flex justify-end">
                  <div className="bg-transparent border border-cyan-600 text-gray-900 dark:text-white px-4 py-2 max-w-[80%]">
                    <p className="text-sm">Hey, saw your proposal</p>
                  </div>
                </div>

                {/* Received message */}
                <div className="flex justify-start">
                  <div className="bg-transparent border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 max-w-[80%]">
                    <p className="text-sm">It's solid. Let's discuss in the Whale pod.</p>
                  </div>
                </div>

                {/* Sent message */}
                <div className="flex justify-end">
                  <div className="bg-transparent border border-cyan-600 text-gray-900 dark:text-white px-4 py-2 max-w-[80%]">
                    <p className="text-sm">Perfect, see you there</p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="px-4 py-3 bg-transparent border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <div className="flex-1 text-gray-400 dark:text-gray-500 text-sm">Type a message...</div>
                <button className="bg-cyan-600 text-white text-xs font-bold px-4 py-1.5 rounded-none hover:bg-cyan-700 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
