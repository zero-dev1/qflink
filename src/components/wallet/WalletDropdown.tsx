import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { truncateAddress, formatBalance, copyToClipboard } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { useQFName } from '@/hooks/useQFName'

export const WalletDropdown: React.FC = () => {
  const { address, balance, disconnect, walletType } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { name: qfName, refresh: refreshQFName } = useQFName(address || undefined)

  const handleCopy = useCallback(async () => {
    if (!address) return
    await copyToClipboard(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [address])

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

  // Display address based on wallet type, prefer QNS name
  const truncated = walletType === 'evm'
    ? truncateAddress(address, 'evm')
    : truncateAddress(address, 'substrate')
  const displayAddress = qfName || truncated

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
        <span className={cn("text-sm font-medium", qfName ? 'text-cyan-400' : 'text-qx-text-primary')}>
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
            {/* QNS Name */}
            {qfName && (
              <div>
                <p className="text-xs text-qx-text-muted mb-1">QNS Name</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {qfName}
                  <span className="text-cyan-400/70 ml-1">.qf</span>
                </p>
              </div>
            )}

            {/* Address */}
            <div>
              <p className="text-xs text-qx-text-muted mb-1">
                Address {walletType === 'evm' ? '(EVM)' : '(Substrate)'}
              </p>
              <div className="flex items-start gap-2">
                <p className="text-sm font-mono break-all text-qx-text-secondary flex-1">
                  {address}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 mt-0.5 p-1 text-qx-text-muted hover:text-cyan-400 transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qx-success">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Balance */}
            <div>
              <p className="text-xs text-qx-text-muted mb-1">Balance</p>
              <p className="text-lg font-semibold text-cyan-400">
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
