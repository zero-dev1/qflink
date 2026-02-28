import React from 'react'
import { useInView } from './useInView'

export const FeatureCreatePod: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div 
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left side - Create pod mockup */}
          <div 
            className={`transition-all duration-700 ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-700 rounded-none overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-900 dark:text-white font-semibold">Create a Pod</span>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4">
                {/* Pod Name */}
                <div>
                  <label className="text-gray-500 dark:text-gray-500 text-xs uppercase tracking-wider mb-2 block">Pod Name</label>
                  <div className="bg-transparent border border-gray-200 dark:border-gray-600 px-3 py-2">
                    <span className="text-gray-900 dark:text-white text-sm">Alpha Traders</span>
                  </div>
                </div>

                {/* Access Type */}
                <div>
                  <label className="text-gray-500 dark:text-gray-500 text-xs uppercase tracking-wider mb-2 block">Access Type</label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-600" />
                      <span className="text-gray-900 dark:text-white text-sm">Token-Gated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-gray-400 dark:border-gray-600" />
                      <span className="text-gray-400 dark:text-gray-500 text-sm">Invite-Only</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Balance */}
                <div>
                  <label className="text-gray-500 dark:text-gray-500 text-xs uppercase tracking-wider mb-2 block">Minimum Balance</label>
                  <div className="bg-transparent border border-gray-400 dark:border-gray-600 px-3 py-2">
                    <span className="text-gray-900 dark:text-white text-sm">1,000 QF</span>
                  </div>
                </div>

                {/* Create Button */}
                <button className="w-full bg-cyan-600 text-white font-bold py-3 rounded-none hover:bg-cyan-700 transition-colors mt-4">
                  Create Pod
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Text */}
          <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-cyan-600 font-mono text-xs uppercase tracking-[0.2em] mb-4">
              #04 / Your Rules
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-4">
              Build your own gated community.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-6 leading-relaxed">
              Create pods with custom token thresholds. Set the barrier to entry — 100 QF, 10K QF, 1M QF. Your pod, your rules. Invite-only mode coming soon.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
