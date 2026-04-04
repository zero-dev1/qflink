import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePodsStore } from '@/stores/pods'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LinkWalletModal } from '@/components/wallet/LinkWalletModal'
import { truncateAddress, formatBalance, copyToClipboard } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { LIMITS } from '@/types'
import { useQFName } from '@/hooks/useQFName'

const ProfilePage: React.FC = () => {
  const { address: routeAddress } = useParams<{ address?: string }>()
  const navigate = useNavigate()
  const { address, balance, linkedWallets, removeLinkedWallet, evmAddress } = useWallet()
  const myPods = usePodsStore((s) => s.myPods)
  const toast = useToast()
  const [showLinkWallet, setShowLinkWallet] = useState(false)

  // Determine if viewing own profile or someone else's
  const targetAddress = routeAddress || evmAddress || address || ''
  const isOwnProfile = !routeAddress || routeAddress.toLowerCase() === (evmAddress || address || '').toLowerCase()

  // Get QNS name for display
  const { name: qnsName } = useQFName(targetAddress)

  const totalBalance = linkedWallets.reduce((sum: bigint, w: { balance: bigint }) => sum + w.balance, balance)
  const podsJoined = myPods.length

  // Display name: QNS name > truncated address
  const displayName = qnsName || truncateAddress(targetAddress, 'evm', 6)
  const displayAddress = targetAddress

  const handleCopy = () => {
    if (displayAddress) {
      copyToClipboard(displayAddress)
      toast.success('Address copied to clipboard')
    }
  }

  const handleLinkWallet = () => {
    if (linkedWallets.length >= LIMITS.MAX_LINKED_WALLETS) {
      toast.error(`Maximum ${LIMITS.MAX_LINKED_WALLETS} linked wallets reached`)
      return
    }
    setShowLinkWallet(true)
  }

  if (!targetAddress) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-20">
          <p className="text-qx-text-secondary">No address provided</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-qx-text-primary">
        {isOwnProfile ? 'Profile' : 'User Profile'}
      </h1>

      {/* Profile Card */}
      <Card>
        <div className="flex flex-col items-center text-center py-4">
          <Avatar address={displayAddress || ''} size="lg" className="mb-4 !w-20 !h-20" />
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-qx-text-primary">
              {displayName}
            </h2>
            {qnsName && (
              <span className="text-[10px] rounded bg-cyan-600/15 px-1.5 py-0.5 text-cyan-600 font-medium">.qf</span>
            )}
          </div>
          <p className="text-xs text-qx-text-muted mt-1">
            Member since February 2026
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 mt-2 text-xs text-qx-text-secondary hover:text-qx-text-primary transition-colors"
          >
            <span className="font-mono">{displayAddress ? truncateAddress(displayAddress) : ''}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          {/* Only show balance/pods for own profile */}
          {isOwnProfile && (
            <div className="flex gap-8 mt-6">
              <div>
                <p className="text-lg font-bold text-cyan-600">{formatBalance(balance)} QF</p>
                <p className="text-xs text-qx-text-muted">QF Balance</p>
              </div>
              <div>
                <p className="text-lg font-bold text-qx-text-primary">{podsJoined}</p>
                <p className="text-xs text-qx-text-muted">Pods Joined</p>
              </div>
            </div>
          )}

          {/* Back button when viewing someone else's profile */}
          {!isOwnProfile && (
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-4 py-2 text-sm font-medium text-qx-text-secondary hover:text-qx-text-primary border border-qx-border-prominent hover:bg-qx-elevated transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </Card>

      {/* Linked Wallets - only show for own profile */}
      {isOwnProfile && (
        <Card
          header={{
            title: `Linked Wallets (${linkedWallets.length + 1}/${LIMITS.MAX_LINKED_WALLETS})`,
            action: linkedWallets.length < LIMITS.MAX_LINKED_WALLETS - 1 ? (
              <Button size="sm" onClick={handleLinkWallet}>+ Link Wallet</Button>
            ) : undefined,
          }}
        >
          <div className="space-y-3">
            {/* Primary wallet */}
            <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 bg-transparent p-3">
              <Avatar address={address || ''} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-qx-text-primary truncate font-mono">{address ? truncateAddress(address) : ''}</p>
                  <span className="text-[10px] rounded bg-cyan-600/15 px-1.5 py-0.5 text-cyan-600 font-medium">Primary</span>
                </div>
                <p className="text-xs text-qx-text-secondary">{formatBalance(balance)} QF</p>
              </div>
            </div>

            {/* Linked wallets */}
            {linkedWallets.map((wallet: { address: string; balance: bigint }) => (
              <div key={wallet.address} className="flex items-center gap-3 border border-qx-card-border p-3">
                <Avatar address={wallet.address} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-qx-text-primary truncate font-mono">{truncateAddress(wallet.address)}</p>
                  <p className="text-xs text-qx-text-secondary">{formatBalance(wallet.balance)} QF</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeLinkedWallet(wallet.address)}>
                  Unlink
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between bg-qx-elevated p-3 mt-2">
              <span className="text-sm text-qx-text-secondary">Aggregate Balance</span>
              <span className="text-sm font-semibold text-cyan-600">{formatBalance(totalBalance)} QF</span>
            </div>
          </div>
        </Card>
      )}

      {isOwnProfile && (
        <LinkWalletModal
          isOpen={showLinkWallet}
          onClose={() => setShowLinkWallet(false)}
        />
      )}
    </div>
  )
}

export default ProfilePage
