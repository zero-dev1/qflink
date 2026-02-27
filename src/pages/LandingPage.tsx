import React from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeatureTokenGated } from '@/components/landing/FeatureTokenGated'
import { FeatureOnChain } from '@/components/landing/FeatureOnChain'
import { FeatureDMs } from '@/components/landing/FeatureDMs'
import { FeatureCreatePod } from '@/components/landing/FeatureCreatePod'
import { NetworkStats } from '@/components/landing/NetworkStats'
import { FooterCTA } from '@/components/landing/FooterCTA'

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white">
      {/* CSS Animations for block pulse */}
      <style>{`
        @keyframes blockPulse {
          0%, 100% { 
            opacity: 0.3; 
            border-color: rgba(0,180,220,0.15); 
          }
          50% { 
            opacity: 1; 
            border-color: rgba(0,180,220,0.6); 
          }
        }
        
        .dark @keyframes blockPulse {
          0%, 100% { 
            opacity: 0.3; 
            border-color: rgba(0,229,255,0.15); 
          }
          50% { 
            opacity: 1; 
            border-color: rgba(0,229,255,0.5); 
          }
        }
        
        .block-item {
          animation: blockPulse 3s ease-in-out infinite;
        }
        
        .block-item:nth-child(1) { animation-delay: 0s; }
        .block-item:nth-child(2) { animation-delay: 0.5s; }
        .block-item:nth-child(3) { animation-delay: 1s; }
        .block-item:nth-child(4) { animation-delay: 1.5s; }
        .block-item:nth-child(5) { animation-delay: 2s; }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <LandingNav />
      
      <main>
        <HeroSection />
        <HowItWorks />
        <FeatureTokenGated />
        <FeatureOnChain />
        <FeatureDMs />
        <FeatureCreatePod />
        <NetworkStats />
        <FooterCTA />
      </main>
    </div>
  )
}

export default LandingPage
