import React, { useState, useRef, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

export const WalletDropdown: React.FC = () => {
  const { address, balance, disconnect, walletType } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDisconnect = async () => {
    setIsOpen(false)
    await disconnect()
  }

  if (!address) return null

  // Display address based on wallet type
  const displayAddress = walletType === 'evm'
    ? truncateAddress(address, 'evm')
    : truncateAddress(address, 'substrate')

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Mobile: Avatar only (32px) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden flex-shrink-0"
      >
        <Avatar 
          address={address} 
          size={32} 
          className="rounded-full border-0"
        />
      </button>

      {/* Desktop: Avatar (24px) + Address + Chevron in minimal pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
          "bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 dark:bg-transparent",
          "border-0"
        )}
      >
        <Avatar 
          address={address} 
          size={24} 
          className="rounded-full border-0"
        />
        <span className="text-sm font-medium text-qx-text-primary">
          {displayAddress}
        </span>
        <span className="text-xs text-qx-text-muted">
          {formatBalance(balance)} QF
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "text-qx-text-muted transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown - Dark mode: bg-[#0D0D0D] border-gray-800, Light mode: bg-white border-gray-200 */}
      {isOpen && (
        <div className={cn(
          "absolute right-0 mt-2 w-64 rounded-none z-50",
          "bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-800"
        )}>
          <div className="p-4 space-y-3">
            {/* Address */}
            <div>
              <p className="text-xs text-qx-text-muted mb-1">
                Address {walletType === 'evm' ? '(EVM)' : '(Substrate)'}
              </p>
              <p className="text-sm font-mono break-all text-qx-text-secondary">
                {address}
              </p>
            </div>

            {/* Balance */}
            <div>
              <p className="text-xs text-qx-text-muted mb-1">Balance</p>
              <p className="text-lg font-semibold text-cyan-600">
                {formatBalance(balance)} QF
              </p>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 rounded-none bg-qx-elevated border border-qx-card-border text-sm font-medium text-qx-text-primary hover:border-cyan-600 hover:text-cyan-600 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
