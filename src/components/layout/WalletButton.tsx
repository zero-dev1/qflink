import React, { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/Button'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { NETWORKS } from '@/lib/network'
import { useNetworkStore } from '@/stores/network'

const NET_DOT: Record<string, string> = {
  local: 'bg-blue-400',
  testnet: 'bg-yellow-400',
  mainnet: 'bg-qf-success',
}
const STATUS_DOT: Record<string, string> = {
  connected: 'bg-qf-success',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500',
  stalled: 'bg-orange-400 animate-pulse',
}

export const WalletButton: React.FC = () => {
  const { address, balance, isConnected, isConnecting, connect, disconnect, walletType } = useWallet()
  const [showOptions, setShowOptions] = useState(false)
  const currentNetwork = useNetworkStore((s) => s.currentNetwork)
  const connectionStatus = useNetworkStore((s) => s.connectionStatus)
  const network = NETWORKS[currentNetwork]

  const handleConnect = async () => {
    try {
      await connect()
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  // Display address based on wallet type
  // For EVM: show 0x41dc...1e01 format
  // For Substrate: show 5FHne...94ty format
  const displayAddress = address
    ? walletType === 'evm'
      ? truncateAddress(address, 'evm')
      : truncateAddress(address, 'substrate')
    : ''

  if (!isConnected) {
    return (
      <div className="relative">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${NET_DOT[currentNetwork] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-qf-text-muted">{network.name}</span>
        </div>
        <Button onClick={handleConnect} size="sm" className="w-full" loading={isConnecting}>
          Connect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-qf-border-subtle bg-qf-elevated p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${NET_DOT[currentNetwork] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-qf-text-muted">{network.name}</span>
        </div>
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT[connectionStatus] || 'bg-gray-400'}`} />
      </div>
      <p className="text-sm font-medium text-qf-text-primary">{displayAddress}</p>
      <p className="text-xs text-qf-text-secondary">{formatBalance(balance)} QF</p>
      <Button variant="ghost" size="sm" onClick={disconnect} className="mt-1">
        Disconnect
      </Button>
    </div>
  )
}
