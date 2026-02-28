import React from 'react'
import { useNetworkStore } from '@/stores/network'
import { NETWORKS } from '@/lib/network'

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-qx-success',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500',
  stalled: 'bg-orange-400 animate-pulse',
}

export const NetworkIndicator: React.FC = () => {
  const currentNetwork = useNetworkStore((s) => s.currentNetwork)
  const connectionStatus = useNetworkStore((s) => s.connectionStatus)
  const network = NETWORKS[currentNetwork]

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${STATUS_DOT[connectionStatus] || 'bg-gray-400'}`} />
      <span className="text-xs text-qx-text-muted">{network.name}</span>
    </div>
  )
}
