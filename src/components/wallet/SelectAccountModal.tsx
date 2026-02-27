import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export interface ExtensionAccount {
  address: string
  name?: string
  source: string
  balance?: bigint
}

interface SelectAccountModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: ExtensionAccount[]
  walletName: string
  onSelect: (account: ExtensionAccount) => Promise<void>
}

export const SelectAccountModal: React.FC<SelectAccountModalProps> = ({
  isOpen,
  onClose,
  accounts,
  walletName,
  onSelect,
}) => {
  const [selected, setSelected] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    const account = accounts.find((a) => a.address === selected)
    if (!account) return
    setIsConnecting(true)
    try {
      await onSelect(account)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Account"
      footer={
        <button
          onClick={handleConnect}
          disabled={!selected || isConnecting}
          className="flex items-center gap-2 rounded-md bg-qf-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-qf-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting && <Spinner size="sm" />}
          Connect
        </button>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-qf-text-secondary mb-3">
          Choose an account from {walletName}:
        </p>

        {accounts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-qf-text-muted">No accounts found in this wallet.</p>
          </div>
        ) : (
          accounts.map((account) => {
            const isSelected = selected === account.address
            return (
              <button
                key={account.address}
                onClick={() => setSelected(account.address)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-qf-accent bg-qf-accent/10'
                    : 'border-qf-border-subtle hover:border-qf-border-prominent hover:bg-qf-elevated'
                }`}
              >
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'border-qf-accent' : 'border-qf-border-prominent'
                  }`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-qf-accent" />
                  )}
                </div>
                <Avatar address={account.address} size="sm" />
                <div className="flex-1 min-w-0">
                  {account.name && (
                    <p className="text-sm font-medium text-qf-text-primary truncate">
                      {account.name}
                    </p>
                  )}
                  <p className="text-xs text-qf-text-muted font-mono">
                    {truncateAddress(account.address, 'substrate', 6)}
                  </p>
                  {account.balance !== undefined && (
                    <p className="text-xs dark:text-qf-accent text-qf-text-primary mt-0.5">
                      {formatBalance(account.balance)} QF
                    </p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </Modal>
  )
}
