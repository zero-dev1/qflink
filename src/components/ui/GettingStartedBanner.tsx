import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { usePodsStore } from '@/stores/pods'

interface Step {
  number: number
  title: string
  description: string
  done: boolean
  isCurrent: boolean
  action?: () => void
  actionLabel?: string
}

export const GettingStartedBanner: React.FC = () => {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)
  
  const isConnected = useWalletStore((s) => s.isConnected)
  const myPods = usePodsStore((s) => s.myPods)
  
  const hasPods = myPods.length > 0
  
  // Hide banner if user has joined at least one pod
  if (hasPods || dismissed) {
    return null
  }
  
  // Determine which step is current
  let currentStep = 1
  if (isConnected && !hasPods) {
    currentStep = 2
  } else if (isConnected && hasPods) {
    currentStep = 3
  }
  
  const handleExploreClick = () => {
    navigate('/explore')
  }
  
  const steps: Step[] = [
    {
      number: 1,
      title: 'Connect Wallet',
      description: 'Connect your Talisman or SubWallet to get started',
      done: isConnected,
      isCurrent: currentStep === 1,
    },
    {
      number: 2,
      title: 'Explore Pods',
      description: 'Browse token-gated communities and find your tribe',
      done: false, // becomes done when they navigate to explore (or we just keep it as next action)
      isCurrent: currentStep === 2,
      action: handleExploreClick,
      actionLabel: 'Explore',
    },
    {
      number: 3,
      title: 'Join or create a pod',
      description: 'Start chatting in a community or launch your own',
      done: hasPods,
      isCurrent: currentStep === 3,
      action: handleExploreClick,
      actionLabel: 'Explore',
    },
  ]
  
  return (
    <div className="bg-white dark:bg-[#0d0d14] border border-gray-200 dark:border-gray-800 p-6 mb-8 relative">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Getting Started</h3>
      
      {/* Steps - horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className={`flex-1 flex items-start gap-3 p-3 ${step.isCurrent ? 'border border-[#0991B2] bg-[#0991B2]/10' : ''}`}>
              {/* Step number / checkmark */}
              <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm font-semibold ${
                step.done
                  ? 'text-[#0991B2]'
                  : step.isCurrent
                  ? 'text-[#0991B2] border border-[#0991B2]'
                  : 'text-gray-500 border border-gray-300 dark:border-gray-600'
              }`}>
                {step.done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold ${
                  step.done ? 'text-[#0991B2]' : step.isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-xs mt-0.5 ${
                  step.done ? 'text-[#0991B2]/70' : step.isCurrent ? 'text-gray-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-600'
                }`}>
                  {step.description}
                </p>
                
                {/* Action button for current step */}
                {step.isCurrent && step.action && step.actionLabel && (
                  <button
                    onClick={step.action}
                    className="mt-2 text-xs bg-[#0991B2] text-white px-3 py-1.5 hover:bg-[#0880A0] transition-colors"
                  >
                    {step.actionLabel}
                  </button>
                )}
              </div>
            </div>
            
            {/* Connector line (desktop only, between steps) */}
            {index < steps.length - 1 && (
              <div className="hidden md:block w-px h-12 bg-gray-200 dark:bg-gray-800 self-center" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default GettingStartedBanner
