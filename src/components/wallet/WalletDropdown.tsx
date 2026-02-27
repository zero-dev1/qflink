import React, { useState, useRef, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-qf-card-border bg-qf-card hover:border-qf-accent transition-colors"
      >
        <Avatar address={address} size="sm" />
        <span className="text-sm font-medium text-qf-text-primary hidden sm:inline">
          {displayAddress}
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
          className={`text-qf-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[#1a1a1a] bg-[#111111] shadow-xl z-50">
          <div className="p-4 space-y-3">
            {/* Address */}
            <div>
              <p className="text-xs text-qf-text-muted mb-1">
                Address {walletType === 'evm' ? '(EVM)' : '(Substrate)'}
              </p>
              <p className="text-sm font-mono text-qf-text-primary break-all">
                {address}
              </p>
            </div>

            {/* Balance */}
            <div>
              <p className="text-xs text-qf-text-muted mb-1">Balance</p>
              <p className="text-lg font-semibold text-qf-accent">
                {formatBalance(balance)} QF
              </p>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 rounded-lg bg-qf-elevated border border-qf-card-border text-sm font-medium text-qf-text-primary hover:border-qf-accent hover:text-qf-accent transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
