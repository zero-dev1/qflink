import React, { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/Button'
import { truncateAddress, formatBalance } from '@/lib/utils'
import { useQFName } from '@/hooks/useQFName'
import { NETWORKS } from '@/lib/network'
import { useNetworkStore } from '@/stores/network'

const NET_DOT: Record<string, string> = {
  local: 'bg-blue-400',
  testnet: 'bg-yellow-400',
  mainnet: 'bg-qx-success',
}
const STATUS_DOT: Record<string, string> = {
  connected: 'bg-qx-success',
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
  
  // Get QNS name for connected address
  const { name: qfName } = useQFName(address || undefined)

  const handleConnect = async () => {
    try {
      await connect()
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  // Display address based on wallet type
  // For EVM: show 0x41dc...1e01 format or .qf name if available
  // For Substrate: show 5FHne...94ty format
  const displayAddress = qfName || (address
    ? walletType === 'evm'
      ? truncateAddress(address, 'evm')
      : truncateAddress(address, 'substrate')
    : '')

  if (!isConnected) {
    return (
      <div className="relative">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${NET_DOT[currentNetwork] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-qx-text-muted">{network.name}</span>
        </div>
        <Button onClick={handleConnect} size="sm" className="w-full" loading={isConnecting}>
          Connect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-qx-border-subtle bg-qx-elevated p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${NET_DOT[currentNetwork] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-qx-text-muted">{network.name}</span>
        </div>
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT[connectionStatus] || 'bg-gray-400'}`} />
      </div>
      <p className={`text-sm font-mono font-medium ${qfName ? 'text-cyan-400' : 'text-qx-text-primary'}`}>{displayAddress}</p>
      <p className="text-xs text-qx-text-secondary">{formatBalance(balance)} QF</p>
      <Button variant="ghost" size="sm" onClick={disconnect} className="mt-1">
        Disconnect
      </Button>
    </div>
  )
}
