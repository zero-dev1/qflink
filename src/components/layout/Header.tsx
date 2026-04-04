import React from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { WalletDropdown } from '@/components/wallet/WalletDropdown'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'
// import { SessionKeyBanner } from '@/components/ui/SessionKeyBanner'

export const Header: React.FC = () => {
  const { isConnected } = useWallet()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0D0D0D] px-4">
      {/* Left: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-qx-text-secondary hover:bg-qx-elevated md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="md:hidden">
          <QFLinkWordmark size={28} variant="auto" />
        </div>
      </div>

      {/* Right: session key banner + wallet dropdown + theme */}
      <div className="flex items-center gap-3">
        {/* {isConnected && <SessionKeyBanner />} */}
        {isConnected && <WalletDropdown />}
        <ThemeToggle />
      </div>
    </header>
  )
}
