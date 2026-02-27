import React from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { WalletDropdown } from '@/components/wallet/WalletDropdown'

export const Header: React.FC = () => {
  const { isConnected } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-qf-border-subtle bg-qf-bg px-4">
      {/* Left: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-qf-text-secondary hover:bg-qf-elevated md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold dark:text-qf-accent text-qf-text-primary md:hidden">QFLink</h1>
      </div>

      {/* Right: wallet dropdown + theme */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <WalletDropdown />
        ) : (
          <button
            onClick={() => setShowConnectWallet(true)}
            className="rounded-lg bg-qf-accent px-4 py-1.5 text-sm font-medium text-qf-accent-text hover:bg-qf-accent-hover transition-colors"
          >
            Connect Wallet
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
